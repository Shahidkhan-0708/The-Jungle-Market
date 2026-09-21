"""Private Supabase objects; the filesystem is only an inference cache in cloud mode."""
import httpx
from fastapi import HTTPException
from jungle_market.core.config import settings


def cloud_media():
    return settings.MEDIA_STORAGE == "supabase"


def storage_request(method, path, **kwargs):
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(503, "Private media storage is not configured.")
    headers = {"apikey":settings.SUPABASE_SERVICE_ROLE_KEY,
               "Authorization":"Bearer "+settings.SUPABASE_SERVICE_ROLE_KEY, **kwargs.pop("headers",{})}
    try:
        response = httpx.request(method, settings.SUPABASE_URL.rstrip('/')+'/storage/v1/'+path,
                                 headers=headers,timeout=60,**kwargs)
        if response.status_code == 404:
            raise HTTPException(404,"Media file unavailable.")
        response.raise_for_status()
        return response
    except httpx.HTTPError:
        raise HTTPException(503,"Private storage is unavailable. Retry shortly.") from None


def read_object(key):
    return storage_request('GET',f'object/authenticated/{settings.SUPABASE_MEDIA_BUCKET}/{key}').content


def write_object(key, data, content_type):
    storage_request('POST',f'object/{settings.SUPABASE_MEDIA_BUCKET}/{key}',content=data,
                    headers={'Content-Type':content_type,'x-upsert':'true'})


def delete_object(key):
    storage_request('DELETE',f'object/{settings.SUPABASE_MEDIA_BUCKET}',json={'prefixes':[key]})


def signed_upload(key):
    result=storage_request('POST',f'object/upload/sign/{settings.SUPABASE_MEDIA_BUCKET}/{key}',json={}).json()
    return settings.SUPABASE_URL.rstrip('/')+'/storage/v1'+result['url']


def signed_read(key):
    result=storage_request('POST',f'object/sign/{settings.SUPABASE_MEDIA_BUCKET}/{key}',json={'expiresIn':60}).json()
    return settings.SUPABASE_URL.rstrip('/')+'/storage/v1'+result['signedURL']
