import asyncio
import io
from types import SimpleNamespace
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from apps.api.main import app
from apps.api.routes.auth import current_user, UserResponse, user_response
from apps.api.routes import media, orders
from jungle_market.infrastructure.database.session import get_db
from jungle_market.infrastructure.database.models.base import Base
from jungle_market.infrastructure.database.models import user, consent, workflow
from jungle_market.infrastructure.ml.colab_client import ColabMLUnavailable


@pytest.fixture
def flow(tmp_path, monkeypatch):
    from apps.api.routes import products
    monkeypatch.setattr(media.settings,"MEDIA_STORAGE","local")
    async def low_score(*args): return {"score":74,"reasons":["Photo requires closer review."]}
    monkeypatch.setattr(products,"assess_listing",low_score)
    engine = create_async_engine("sqlite+aiosqlite:///" + str(tmp_path / "test.db"))
    @event.listens_for(engine.sync_engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")
    async def setup():
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
    asyncio.run(setup())
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async def database():
        async with sessions() as session:
            yield session
    actors = {role: UserResponse(id=uuid4(), full_name=role, email=role+"@example.invalid",
                                role="ARTISAN" if role == "OTHER" else role)
              for role in ["ARTISAN", "AMBASSADOR", "BUYER", "OTHER"]}
    selected = ["ARTISAN"]
    app.dependency_overrides[get_db] = database
    app.dependency_overrides[current_user] = lambda: actors[selected[0]]
    monkeypatch.setattr(media, "MEDIA_ROOT", tmp_path / "media")
    monkeypatch.setattr(orders.settings, "SECRET_KEY", "test-signing-secret-with-at-least-32-characters")
    with TestClient(app) as client:
        yield client, selected, actors
    app.dependency_overrides.clear()
    asyncio.run(engine.dispose())


def save_craft(client):
    image = io.BytesIO()
    Image.new("RGB", (64, 64), "green").save(image, "PNG")
    response = client.post("/v1/media/image", data={"processing_consent":"true"},
        files={"file":("craft.png",image.getvalue(),"image/png")})
    assert response.status_code == 201, response.text
    image_id = response.json()["id"]
    response = client.post("/v1/products", json={"title":"River basket", "description":"Handwoven by the maker.",
        "materials":"Bamboo", "category":"Basket", "region":"Mandla", "length_cm":20,"width_cm":15,"height_cm":10,
        "price":1250, "stock":4, "image_id":image_id, "processing_consent":True, "image_public_consent":True})
    assert response.status_code == 201, response.text
    return response.json()


def test_publication_threshold_and_stale_assessment(flow, monkeypatch):
    from apps.api.routes import products
    client, selected, _ = flow
    score=[74]
    async def assess(*args): return {"score":score[0],"reasons":["Listing consistency checked."]}
    monkeypatch.setattr(products,"assess_listing",assess)
    for value in [74,75,76]:
        score[0]=value
        craft=save_craft(client);url='/v1/products/'+craft['id']
        assert client.post(url+'/publish').status_code==409
        result=client.post(url+'/submit')
        assert result.status_code==200,result.text
        assessed=result.json()
        assert assessed['ai_assessment']['score']==value
        assert 'ai_assessment' not in assessed['draft']
        if value<75:
            assert assessed['status']=='NEEDS_REVIEW'
            assert client.post(url+'/publish').status_code==409
        else:
            assert assessed['status']=='DRAFT'
            assert client.post(url+'/publish').json()['status']=='PUBLISHED'
            public=client.get('/v1/catalog/product/'+craft['id']).json()
            assert public['verification_state']=='AI_REVIEWED'
            assert any(p['id']==craft['id'] for p in client.get('/v1/catalog/search').json()['data'])
            withdrawn=client.post(url+'/withdraw').json()
            assert withdrawn['ai_assessment'] is None
            assert client.post(url+'/publish').status_code==409
    craft=save_craft(client);url='/v1/products/'+craft['id']
    async def offline(*args): raise RuntimeError('offline')
    monkeypatch.setattr(products,'assess_listing',offline)
    assert client.post(url+'/submit').status_code==503
    assert client.post(url+'/publish').status_code==409


def test_cost_pricing_allocates_tools_and_never_invents_missing_costs(flow, monkeypatch):
    from apps.api.routes import features
    from jungle_market.services.pricing.costs import CostItem
    client, _, _ = flow
    items = [CostItem(label="Bamboo",category="materials",amount=200,units=1),
             CostItem(label="Labour",category="labour",amount=300,units=1),
             CostItem(label="Tool",category="equipment",amount=1000,units=100),
             CostItem(label="Packaging",category="packaging",amount=40,units=1)]
    async def extract(story):
        assert story == "Spoken craft costs"
        return items
    monkeypatch.setattr(features,"extract_costs",extract)
    payload={"story":"Spoken craft costs","processing_consent":True,"markup_percent":20}
    response=client.post('/v1/pricing/suggest',json=payload)
    assert response.status_code==200,response.text
    result=response.json()
    assert result['production_cost']==550 and result['profit']==110
    assert result['suggested_price']==773 and result['items'][2]['per_craft']==10
    rows=[item.model_dump() for item in items]
    rows[2]['units']=None
    missing=client.post('/v1/pricing/suggest',json={**payload,'items':rows}).json()
    assert missing['suggested_price'] is None and missing['missing']==['Tool']
    rows[2]['units']=0
    assert client.post('/v1/pricing/suggest',json={**payload,'items':rows}).status_code==422
    assert client.post('/v1/pricing/suggest',json={**payload,'processing_consent':False}).status_code==422
    craft=save_craft(client)
    draft={**craft['draft'],'cost_items':[i.model_dump() for i in items],'cost_notes':'Costs confirmed','cost_markup_percent':20,'price':773}
    saved=client.put('/v1/products/'+craft['id'],json=draft)
    assert saved.status_code==200,saved.text
    assert saved.json()['draft']['cost_items'][2]['units']==100


def test_photo_autofill_caches_suggestions_and_preserves_private_access(flow, monkeypatch):
    client, selected, _ = flow
    craft = save_craft(client)
    image_id = craft["draft"]["image_id"]
    calls = []
    async def identify(path):
        calls.append(path)
        return {"title":"Woven basket","category":"Basket","materials":"Bamboo, rattan"}
    monkeypatch.setattr(media, "identify_craft", identify)
    url = f"/v1/media/{image_id}/identify"
    result = client.post(url)
    assert result.status_code == 200, result.text
    assert result.json()["title"] == "Woven basket"
    assert result.json()["requires_review"] is True
    assert result.json()["region"] == ""  # never infer a village from pixels
    assert client.post(url).json() == result.json()
    assert len(calls) == 1
    selected[0] = "OTHER"
    assert client.post(url).status_code == 404
    selected[0] = "ARTISAN"
    other_image = save_craft(client)["draft"]["image_id"]
    async def unavailable(path):
        raise RuntimeError("provider offline")
    monkeypatch.setattr(media, "identify_craft", unavailable)
    assert client.post(f"/v1/media/{other_image}/identify").status_code == 503
    assert client.get(f"/v1/media/{other_image}").status_code == 200
    assert client.post("/v1/consent", json={"processing":False}).status_code == 200
    assert client.post(url).status_code == 403


def test_aruco_measurement_uses_original_scale_and_checks_ownership(flow, monkeypatch):
    import cv2
    import numpy as np
    client, selected, _ = flow
    image = np.full((1000, 1000, 3), 255, dtype=np.uint8)
    marker = cv2.aruco.generateImageMarker(cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50), 0, 100)
    image[40:140, 40:140] = marker[:, :, None]
    image[200:500, 250:450] = (150, 80, 30)
    output = io.BytesIO(); Image.fromarray(image).save(output, "PNG")
    uploaded = client.post("/v1/media/image", data={"processing_consent":"true"},
        files={"file":("marker.png", output.getvalue(), "image/png")})
    assert uploaded.status_code == 201
    image_id = uploaded.json()["id"]
    rgba = np.dstack((image, np.zeros((1000,1000), dtype=np.uint8)))
    rgba[200:500,250:450,3] = 255
    rgba[40:140,40:140,3] = 255  # reference marker must not enter the box
    segmented = io.BytesIO(); Image.fromarray(rgba).save(segmented, "PNG")
    async def cutout(*args):
        return segmented.getvalue()
    monkeypatch.setattr(media.colab_ml, "remove_background", cutout)
    processed = client.post(f"/v1/media/{image_id}/remove-background").json()["id"]
    source_url = f"/v1/media/{processed}/measurement-source"
    assert client.get(source_url).json()["id"] == image_id
    auto_url = f"/v1/media/{processed}/auto-dimensions"
    automatic = client.post(auto_url,json={"marker_size_cm":5})
    assert automatic.status_code == 200, automatic.text
    assert automatic.json()["bounds"] == [.25,.2,.2,.3]
    assert abs(automatic.json()["width_cm"]-10)<.2
    url = f"/v1/media/{processed}/dimensions"
    bounds = {"marker_size_cm":5,"x":.25,"y":.2,"width":.2,"height":.3}
    response = client.post(url, json=bounds)
    assert response.status_code == 200, response.text
    result = response.json()
    assert abs(result["width_cm"]-10)<.2 and abs(result["height_cm"]-15)<.2
    assert result["verified"] is False and result["requires_review"] is True
    assert "depth_cm" not in result
    assert client.get(source_url).json()["dimension_measurement"] == result
    scaled = client.post(url, json={**bounds,"marker_size_cm":10}).json()
    assert abs(scaled["width_cm"]-2*result["width_cm"])<.03
    for patch in [{"marker_size_cm":0},{"x":.9},{"x":.04,"y":.04}]:
        assert client.post(url, json={**bounds,**patch}).status_code == 422
    selected[0] = "OTHER"
    assert client.post(auto_url,json={}).status_code == 404
    assert client.get(source_url).status_code == 404
    assert client.post(url, json=bounds).status_code == 404
    selected[0] = "ARTISAN"
    plain = save_craft(client)["draft"]["image_id"]
    assert client.post(f"/v1/media/{plain}/dimensions", json=bounds).status_code == 422
    assert client.post("/v1/consent", json={"processing":False}).status_code == 200
    assert client.post(url, json=bounds).status_code == 403
    assert client.post(auto_url,json={}).status_code == 403


def test_description_generation_rewrites_and_requires_consent(flow, monkeypatch):
    import json
    from apps.api.routes import features
    client, _, _ = flow
    generated = ["A bamboo basket made in Mandla. Its woven form brings the maker's craft into your home."]
    class AI:
        def __init__(self, **kwargs):
            self.chat = SimpleNamespace(completions=self)
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def create(self, **kwargs):
            assert "do not paste the transcript" in kwargs["messages"][0]["content"]
            return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps({"description":generated[0]})))])
    monkeypatch.setattr(features, "AsyncOpenAI", AI)
    monkeypatch.setattr(features.settings, "FACTORY_API_KEY", "test")
    payload = {"title":"Bamboo basket","category":"Basket","materials":"Bamboo","region":"Mandla",
               "story":"I made this basket and I want to sell it for five hundred rupees.", "processing_consent":True}
    response = client.post("/v1/listing/description", json=payload)
    assert response.status_code == 200 and response.json()["requires_review"]
    assert payload["story"] not in response.json()["description"]
    assert client.post("/v1/listing/description",json={**payload,"processing_consent":False}).status_code == 422
    generated[0] = payload["story"]
    assert client.post("/v1/listing/description",json=payload).status_code == 503


def publish(client, selected, craft):
    pid = craft["id"]
    assert client.post(f"/v1/products/{pid}/publish").status_code == 409
    assert client.post(f"/v1/products/{pid}/submit").status_code == 200
    selected[0] = "AMBASSADOR"
    assert client.get("/v1/ambassador/queue").json()["count"] == 1
    result = client.post("/v1/ambassador/review", json={"product_id":pid,"action":"APPROVE",
        "version":craft["draft"]["version"],"notes":"All facts checked against the physical craft.",
        "checks":["materials","dimensions","origin","story"]})
    assert result.status_code == 200, result.text
    selected[0] = "ARTISAN"
    assert client.post(f"/v1/products/{pid}/publish").status_code == 200


def pay(client, pid):
    payload = {"items":[{"product_id":pid,"qty":1}],"shipping_address":"Test street, test city 123456","request_id":str(uuid4())}
    response = client.post("/v1/orders/checkout",json=payload)
    assert response.status_code == 200, response.text
    order = response.json()
    assert client.post("/v1/orders/checkout",json=payload).json()["order_id"] == order["order_id"]
    prefix = "/v1/orders/"+order["order_id"]
    assert client.get(prefix+"/payment").json()["gateway_order_id"] == order["gateway_order_id"]
    assert client.post(prefix+"/payment/mock",json={"method":"upi","simulate_failure":True}).status_code == 402
    callback = client.post(prefix+"/payment/mock",json={"method":"upi"}).json()
    assert client.post(prefix+"/payment/verify",json={**callback,"signature":"0"*64}).status_code == 400
    assert client.post(prefix+"/payment/verify",json=callback).status_code == 200
    assert client.post(prefix+"/payment/verify",json=callback).status_code == 200
    assert client.get(prefix+"/payment").status_code == 409
    return prefix


def test_real_listing_review_catalog_order_and_settlement(flow):
    client, selected, actors = flow
    craft = save_craft(client)
    pid, image_id = craft["id"], craft["draft"]["image_id"]
    assert client.get("/v1/catalog/search").json()["data"] == []
    assert client.get(f"/v1/media/{image_id}/public").status_code == 404
    selected[0] = "OTHER"
    assert client.put("/v1/products/"+pid,json=craft["draft"]).status_code == 404
    assert client.get("/v1/media/"+image_id).status_code == 404
    assert client.get("/v1/ambassador/queue").status_code == 403
    selected[0] = "ARTISAN"
    publish(client, selected, craft)
    result = client.get("/v1/catalog/search?q=River").json()["data"]
    assert len(result) == 1 and result[0]["id"] == pid
    assert client.get("/v1/catalog/search?max_price=1000").json()["data"] == []
    assert client.get(f"/v1/media/{image_id}/public").status_code == 200
    assert client.get(f"/v1/catalog/product/{pid}").json()["evidence"]
    assert client.get(f"/v1/certificates/{pid}.pdf").content.startswith(b"%PDF")
    selected[0] = "BUYER"
    order = pay(client, pid)
    assert client.get(f"/v1/catalog/product/{pid}").json()["stock"] == 3
    selected[0] = "ARTISAN"
    saved = client.get("/v1/products").json()["data"][0]
    assert saved["draft"]["stock"] == 3
    assert saved["last_review"]["decision"] == "APPROVE"
    selected[0] = "BUYER"
    assert client.post(order+"/fulfill?status=PROCESSING").status_code == 404
    selected[0] = "OTHER"
    assert client.get(order+"/status").status_code == 404
    selected[0] = "ARTISAN"
    assert client.post(order+"/fulfill?status=DELIVERED").status_code == 409
    for stage in ["PROCESSING","READY_TO_SHIP","SHIPPED","DELIVERED"]:
        response=client.post(order+"/fulfill?status="+stage)
        assert response.status_code == 200, response.text
    payout=client.post(order+"/payout").json()
    assert payout["status"] == "SIMULATED" and payout["amount"] == 1137
    assert client.post(order+"/payout").json()["settlement_id"] == payout["settlement_id"]
    assert client.get("/v1/reports/impact").json()["simulated_maker_settlements"] == 1137
    assert client.get("/v1/reports/impact.pptx").content.startswith(b"PK")
    selected[0] = "BUYER"
    cancelled=pay(client,pid)
    assert client.post(cancelled+"/cancel",json={}).json()["payment_status"] == "REFUNDED_SIMULATED"
    assert client.post(cancelled+"/cancel",json={}).status_code == 200
    assert client.get(f"/v1/catalog/product/{pid}").json()["stock"] == 3

    selected[0] = "ARTISAN"
    assert client.post("/v1/consent", json={"processing":False}).status_code == 200
    assert client.get(f"/v1/media/{image_id}/public").status_code == 404
    assert client.post(f"/v1/media/{image_id}/remove-background").status_code == 403
    assert client.get("/v1/catalog/search").json()["data"] == []


def test_draft_conflict_consent_media_failure_and_deletion(flow, monkeypatch):
    client, selected, actors = flow
    craft=save_craft(client)
    pid=craft["id"]
    assert client.put("/v1/products/"+pid,json={**craft["draft"],"version":0}).status_code == 409
    assert client.post("/v1/media/audio",files={"file":("voice.wav",b"RIFFtest","audio/wav")}).status_code == 422
    audio=client.post("/v1/media/audio",data={"processing_consent":"true"},
        files={"file":("voice.webm",b"test-recording","audio/webm")}).json()
    async def unavailable(*args, **kwargs):
        raise ColabMLUnavailable("Outage")
    monkeypatch.setattr(media.colab_ml,"transcribe",unavailable)
    assert client.post("/v1/media/"+audio["id"]+"/transcribe").status_code == 503
    assert client.get("/v1/media/"+audio["id"]).content == b"test-recording"
    async def transcribed(*args,**kwargs):
        return {"transcript":"My family makes these baskets.","language":"en"}
    monkeypatch.setattr(media.colab_ml,"transcribe",transcribed)
    assert client.post("/v1/media/"+audio["id"]+"/transcribe").json()["transcript"] == "My family makes these baskets."
    payload={**craft["draft"],"audio_id":audio["id"],"translation":"A translated story","translation_approved":False}
    saved=client.put("/v1/products/"+pid,json=payload).json()
    assert client.post("/v1/products/"+pid+"/submit").status_code == 422
    assert client.post("/v1/consent",json={"processing":True}).status_code == 200
    assert client.get("/v1/consent").json()["processing"] is True
    assert client.post("/v1/consent/delete-data").json()["status"] == "COMPLETED"
    assert client.get("/v1/media/"+audio["id"]).status_code == 404
    assert client.get("/v1/products").json()["data"][0]["status"] == "ARCHIVED"
    assert client.post("/v1/products/"+pid+"/withdraw").status_code == 409


def test_persistent_features_are_scoped_to_participants(flow):
    client,selected,actors=flow
    craft=save_craft(client)
    publish(client,selected,craft)
    selected[0]="BUYER"
    pid=craft["id"]
    assert client.post("/v1/messages",json={"product_id":pid,"body":"Can you make two?"}).status_code == 201
    assert client.post("/v1/custom-orders",json={"product_id":pid,"dimensions":"20 cm","finish":"Natural","quantity":2}).status_code == 201
    selected[0]="OTHER"
    assert client.get("/v1/messages").json()["data"] == []
    selected[0]="ARTISAN"
    message=client.get("/v1/messages").json()["data"][0]
    assert client.post("/v1/messages",json={"product_id":pid,"body":"Yes, two weeks.","recipient_id":message["owner_id"]}).status_code == 201
    assert len(client.get("/v1/custom-orders").json()["data"]) == 1
    selected[0]="AMBASSADOR"
    assert client.post("/v1/ambassador/visits",json={"artisan":"Maker","village":"Mandla","date":"2099-01-01","time":"11:00","purpose":"Field verification"}).status_code == 201
    assert client.get("/v1/ambassador/visits").json()["data"][0]["date"] == "2099-01-01"


def test_user_metadata_cannot_grant_ambassador():
    raw=SimpleNamespace(id=uuid4(),email="test@example.invalid",user_metadata={"account_role":"AMBASSADOR"},app_metadata={})
    assert user_response(raw).role == "BUYER"
    raw.app_metadata={"account_role":"AMBASSADOR"}
    assert user_response(raw).role == "AMBASSADOR"


def test_mutations_require_authentication():
    client=TestClient(app)
    assert client.post("/v1/products",json={}).status_code == 401
    assert client.post("/v1/consent/delete-data").status_code == 401
    assert client.post("/appraise").status_code == 401



def test_signed_upload_requires_owner_and_finalizes_image(flow, monkeypatch):
    client, selected, actors = flow
    monkeypatch.setattr(media.settings,"MEDIA_STORAGE","supabase")
    objects={}
    monkeypatch.setattr(media,"signed_upload",lambda key:"https://storage.example/"+key)
    monkeypatch.setattr(media,"read_object",lambda key:objects[key])
    monkeypatch.setattr(media,"write_object",lambda key,data,kind:objects.update({key:data}))
    monkeypatch.setattr(media,"delete_object",lambda key:objects.pop(key,None))
    monkeypatch.setattr(media,"signed_read",lambda key:"https://storage.example/"+key)
    payload={"kind":"image","content_type":"image/png","size":100,"processing_consent":True}
    result=client.post("/v1/media/upload-url",json=payload)
    assert result.status_code==200,result.text
    asset_id=result.json()["id"]
    url="/v1/media/"+asset_id
    assert client.get(url).status_code==409
    selected[0]="OTHER"
    assert client.post(url+"/complete-upload").status_code==404
    selected[0]="ARTISAN"
    raw=io.BytesIO();Image.new("RGB",(20,20),"green").save(raw,"PNG")
    key=f"incoming/{actors['ARTISAN'].id}/{asset_id}"
    objects[key]=raw.getvalue()
    result=client.post(url+"/complete-upload")
    assert result.status_code==200,result.text
    assert result.json()["content_type"]=="image/jpeg"
    assert key not in objects
    assert client.post(url+"/complete-upload").status_code==200
    assert client.get(url,follow_redirects=False).status_code==307
    selected[0]="OTHER"
    assert client.get(url,follow_redirects=False).status_code==404
    assert client.get(url+"/public",follow_redirects=False).status_code==404
