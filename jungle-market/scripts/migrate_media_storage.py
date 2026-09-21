"""Copy existing private media to Supabase and verify bytes; never remove local originals."""
import asyncio
import hashlib
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from sqlalchemy import select
from jungle_market.core.config import settings
from jungle_market.infrastructure.database.session import AsyncSessionLocal
from jungle_market.infrastructure.database.models.workflow import MediaAsset
from jungle_market.infrastructure.media_storage import storage_request, write_object, read_object

async def main():
    buckets=storage_request('GET','bucket').json()
    bucket=next((b for b in buckets if b['id']==settings.SUPABASE_MEDIA_BUCKET),None)
    if bucket and bucket.get('public'):
        raise RuntimeError('Refusing to use a public media bucket.')
    if not bucket:
        storage_request('POST','bucket',json={'id':settings.SUPABASE_MEDIA_BUCKET,'name':settings.SUPABASE_MEDIA_BUCKET,
            'public':False,'file_size_limit':25*1024*1024})
    root=Path('data/private-media').resolve();count=0;missing=0
    async with AsyncSessionLocal() as db:
        assets=(await db.execute(select(MediaAsset))).scalars().all()
        for asset in assets:
            if (asset.metadata_record or {}).get('upload_pending'): continue
            path=(root/asset.path).resolve()
            if path.parent!=root: raise RuntimeError('Invalid media path.')
            if not path.is_file():
                missing+=1;continue
            data=path.read_bytes()
            write_object(asset.path,data,asset.content_type)
            if hashlib.sha256(read_object(asset.path)).digest()!=hashlib.sha256(data).digest():
                raise RuntimeError('Storage verification failed.')
            count+=1
            print(f"Verified media {count}/{len(assets)}",flush=True)
    print(f'Private media copied and verified: {count}; missing local files: {missing}. Originals retained.')
    if missing: raise SystemExit(1)

if __name__=='__main__': asyncio.run(main())
