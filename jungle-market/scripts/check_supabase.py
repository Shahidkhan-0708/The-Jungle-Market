"""Verify PostgreSQL workflow in a rolled-back transaction; no real accounts or emails."""
import asyncio
import io
import sys
import tempfile
from pathlib import Path
from uuid import uuid4
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import httpx
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.main import app
from apps.api.routes import media, products
from apps.api.routes.auth import current_user, UserResponse
from jungle_market.infrastructure.database.session import engine, get_db

async def main():
    actors = {role: UserResponse(id=uuid4(), email='smoke@example.invalid', full_name='Smoke check', role=role)
              for role in ['ARTISAN', 'AMBASSADOR', 'BUYER']}
    selected = ['ARTISAN']
    original_media_root = media.MEDIA_ROOT
    original_storage = media.settings.MEDIA_STORAGE
    original_assessor = products.assess_listing
    media.settings.MEDIA_STORAGE = "local"
    async def synthetic_review(*args):
        return {"score":74,"reasons":["Synthetic transaction check; no model inference."]}
    products.assess_listing = synthetic_review
    async with engine.connect() as connection:
        transaction = await connection.begin()
        async def database():
            async with AsyncSession(bind=connection, expire_on_commit=False, join_transaction_mode='create_savepoint') as session:
                yield session
        app.dependency_overrides[get_db] = database
        app.dependency_overrides[current_user] = lambda: actors[selected[0]]
        try:
            with tempfile.TemporaryDirectory(prefix='.tmp-supabase-', dir='qa-reports') as temporary:
                media.MEDIA_ROOT = Path(temporary).resolve()
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
                    async def post(path, **kwargs):
                        response = await client.post(path, **kwargs)
                        assert response.is_success, f'{path}: HTTP {response.status_code}'
                        return response.json()
                    image = io.BytesIO(); Image.new('RGB', (32,32), 'green').save(image, 'PNG')
                    asset = await post('/v1/media/image', data={'processing_consent':'true'}, files={'file':('check.png', image.getvalue(), 'image/png')})
                    import cv2
                    import numpy as np
                    calibration = np.full((800, 800, 3), 255, dtype=np.uint8)
                    marker = cv2.aruco.generateImageMarker(cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50), 0, 100)
                    calibration[30:130,30:130] = marker[:,:,None]
                    calibration[200:500,240:440] = (140,80,40)
                    photo_bytes = io.BytesIO(); Image.fromarray(calibration).save(photo_bytes, 'PNG')
                    calibrated = await post('/v1/media/image', data={'processing_consent':'true'},
                        files={'file':('calibration.png',photo_bytes.getvalue(),'image/png')})
                    measurement = await post('/v1/media/'+calibrated['id']+'/dimensions',
                        json={'marker_size_cm':5,'x':.3,'y':.25,'width':.25,'height':.375})
                    assert abs(measurement['width_cm']-10)<.2 and abs(measurement['height_cm']-15)<.2
                    source = await client.get('/v1/media/'+calibrated['id']+'/measurement-source')
                    assert source.json()['dimension_measurement']['source']=='aruco_selected_bounds'
                    print('Local ArUco / Supabase measurement evidence passed.', flush=True)
                    story = {}
                    if '--with-colab' in sys.argv:
                        photo = await post('/v1/media/image', data={'processing_consent':'true'},
                            files={'file':('basket.png', Path('public/basket.png').read_bytes(), 'image/png')})
                        asset = await post('/v1/media/'+photo['id']+'/remove-background')
                        audio = await post('/v1/media/audio', data={'processing_consent':'true'},
                            files={'file':('test.wav', Path('qa-reports/colab-test.wav').read_bytes(), 'audio/wav')})
                        transcript = await post('/v1/media/'+audio['id']+'/transcribe', data={'source_language':'en'})
                        translation = await post('/v1/media/'+audio['id']+'/translate', data={'source_language':'en'})
                        assert 'bamboo' in transcript['transcript'].lower()
                        assert 'bamboo' in translation['translated_text'].lower()
                        story = {'audio_id':audio['id'], 'transcript':transcript['transcript'],
                            'translation':translation['translated_text'], 'translation_approved':True,
                            'audio_public_consent':True, 'language':'en'}
                        print('Local API / Supabase media / Colab inference passed.', flush=True)
                    craft = await post('/v1/products', json={'title':'Transactional smoke check', 'description':'Synthetic test, rolled back.',
                        'category':'Basket','materials':'Bamboo','region':'Test','length_cm':10,'width_cm':10,'height_cm':10,
                        'price':1000,'stock':2,'image_id':asset['id'],'processing_consent':True,'image_public_consent':True, **story})
                    pid = craft['id']
                    await post('/v1/products/'+pid+'/submit')
                    selected[0] = 'AMBASSADOR'
                    await post('/v1/ambassador/review',json={'product_id':pid,'action':'APPROVE','version':1,
                        'notes':'Synthetic checks for transaction validation.','checks':['materials','dimensions','origin','story']})
                    selected[0] = 'ARTISAN'
                    await post('/v1/products/'+pid+'/publish')
                    selected[0] = 'BUYER'
                    payload={'items':[{'product_id':pid,'qty':1}],'shipping_address':'Synthetic address for test only','request_id':str(uuid4())}
                    order=await post('/v1/orders/checkout',json=payload)
                    assert (await post('/v1/orders/checkout',json=payload))['order_id']==order['order_id']
                    prefix='/v1/orders/'+order['order_id']
                    payment=await post(prefix+'/payment/mock',json={'method':'upi'})
                    await post(prefix+'/payment/verify',json=payment)
                    await post(prefix+'/payment/verify',json=payment)
                    result=await client.get('/v1/catalog/product/'+pid)
                    assert result.json()['stock']==1
                    await post(prefix+'/cancel',json={})
                    await post(prefix+'/cancel',json={})
                    result=await client.get('/v1/catalog/product/'+pid)
                    assert result.json()['stock']==2
                    print('Supabase workflow passed: create, review, publish, checkout, retry, payment, cancellation, stock.')
        finally:
            app.dependency_overrides.clear()
            media.MEDIA_ROOT=original_media_root
            media.settings.MEDIA_STORAGE=original_storage
            products.assess_listing=original_assessor
            await transaction.rollback()
    await engine.dispose()
    print('All synthetic database rows rolled back; temporary media removed.')

if __name__=='__main__':
    asyncio.run(main())
