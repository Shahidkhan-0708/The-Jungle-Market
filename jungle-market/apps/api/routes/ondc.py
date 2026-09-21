from fastapi import APIRouter, BackgroundTasks, Request, HTTPException
from typing import Dict, Any

from jungle_market.domain.ondc import (
    BecknSearchRequest, 
    BecknSelectRequest, 
    BecknInitRequest, 
    BecknConfirmRequest, 
    BecknStatusRequest, 
    BecknCancelRequest,
    BecknResponse
)
from jungle_market.services.ondc_worker import (
    process_ondc_search,
    process_ondc_select,
    process_ondc_init,
    process_ondc_confirm,
    process_ondc_status,
    process_ondc_cancel
)

router = APIRouter(prefix="/ondc", tags=["ondc"])

def _verify_signature(request: Request):
    """
    Mock implementation of ONDC Ed25519 signature verification.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        print("[ONDC] Warning: Missing Authorization signature")
    return True

@router.post("/search", response_model=BecknResponse)
async def ondc_search(request: Request, payload: BecknSearchRequest, bg_tasks: BackgroundTasks):
    _verify_signature(request)
    context_dict = payload.context.model_dump(mode="json")
    intent_dict = payload.message.intent.model_dump(mode="json") if payload.message.intent else {}
    bg_tasks.add_task(process_ondc_search, context_dict, intent_dict)
    return BecknResponse()

@router.post("/select", response_model=BecknResponse)
async def ondc_select(request: Request, payload: BecknSelectRequest, bg_tasks: BackgroundTasks):
    _verify_signature(request)
    context_dict = payload.context.model_dump(mode="json")
    order_dict = payload.message.order
    bg_tasks.add_task(process_ondc_select, context_dict, order_dict)
    return BecknResponse()

@router.post("/init", response_model=BecknResponse)
async def ondc_init(request: Request, payload: BecknInitRequest, bg_tasks: BackgroundTasks):
    _verify_signature(request)
    context_dict = payload.context.model_dump(mode="json")
    order_dict = payload.message.order
    bg_tasks.add_task(process_ondc_init, context_dict, order_dict)
    return BecknResponse()

@router.post("/confirm", response_model=BecknResponse)
async def ondc_confirm(request: Request, payload: BecknConfirmRequest, bg_tasks: BackgroundTasks):
    _verify_signature(request)
    context_dict = payload.context.model_dump(mode="json")
    order_dict = payload.message.order
    bg_tasks.add_task(process_ondc_confirm, context_dict, order_dict)
    return BecknResponse()

@router.post("/status", response_model=BecknResponse)
async def ondc_status(request: Request, payload: BecknStatusRequest, bg_tasks: BackgroundTasks):
    _verify_signature(request)
    context_dict = payload.context.model_dump(mode="json")
    order_id = payload.message.order_id
    bg_tasks.add_task(process_ondc_status, context_dict, order_id)
    return BecknResponse()

@router.post("/cancel", response_model=BecknResponse)
async def ondc_cancel(request: Request, payload: BecknCancelRequest, bg_tasks: BackgroundTasks):
    _verify_signature(request)
    context_dict = payload.context.model_dump(mode="json")
    order_id = payload.message.order_id
    reason_id = payload.message.cancellation_reason_id
    bg_tasks.add_task(process_ondc_cancel, context_dict, order_id, reason_id)
    return BecknResponse()

# ---------------------------------------------------------
# Mock Webhook Endpoints (Simulating Buyer App endpoints)
# ---------------------------------------------------------
@router.post("/on_search")
async def mock_buyer_on_search(payload: Dict[str, Any]):
    print("--- [MOCK BUYER APP] Received /on_search ---")
    return {"status": "ACK"}

@router.post("/on_select")
async def mock_buyer_on_select(payload: Dict[str, Any]):
    print("--- [MOCK BUYER APP] Received /on_select ---")
    return {"status": "ACK"}

@router.post("/on_init")
async def mock_buyer_on_init(payload: Dict[str, Any]):
    print("--- [MOCK BUYER APP] Received /on_init ---")
    return {"status": "ACK"}

@router.post("/on_confirm")
async def mock_buyer_on_confirm(payload: Dict[str, Any]):
    print("--- [MOCK BUYER APP] Received /on_confirm ---")
    return {"status": "ACK"}

@router.post("/on_status")
async def mock_buyer_on_status(payload: Dict[str, Any]):
    print("--- [MOCK BUYER APP] Received /on_status ---")
    return {"status": "ACK"}

@router.post("/on_cancel")
async def mock_buyer_on_cancel(payload: Dict[str, Any]):
    print("--- [MOCK BUYER APP] Received /on_cancel ---")
    return {"status": "ACK"}
