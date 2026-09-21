import asyncio
import httpx
from typing import Dict, Any
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import uuid

from jungle_market.infrastructure.database.session import AsyncSessionLocal
from jungle_market.infrastructure.database.models.product import Product
from jungle_market.infrastructure.database.models.user import ArtisanProfile

async def _send_callback(bap_uri: str, action: str, payload: Dict[str, Any]):
    callback_url = f"{bap_uri}/{action}"
    print(f"[ONDC Worker] {action.upper()} completed. Firing callback to {callback_url}")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(callback_url, json=payload, timeout=5.0)
            print(f"[ONDC Worker] Callback response from {bap_uri}: {response.status_code}")
    except Exception as e:
        print(f"[ONDC Worker] Callback failed to {callback_url}: {e}")

async def process_ondc_search(context: Dict[str, Any], intent: Dict[str, Any]):
    # Get search string if any
    search_query = ""
    if intent and "item" in intent and "descriptor" in intent["item"]:
        search_query = intent["item"]["descriptor"].get("name", "")

    # Query DB
    async with AsyncSessionLocal() as session:
        stmt = select(Product).filter(Product.status == "PUBLISHED")
        if search_query:
            stmt = stmt.filter(Product.title.ilike(f"%{search_query}%"))
            
        result = await session.execute(stmt)
        products = result.scalars().all()
        
        # In a real system, group by artisan. For simplicity here, just create one provider if there are products.
        providers = []
        if products:
            # Let's get the artisan for the first product just for the provider descriptor
            artisan_id = products[0].artisan_id
            artisan = await session.get(ArtisanProfile, artisan_id)
            
            provider_items = []
            for p in products:
                provider_items.append({
                    "id": str(p.id),
                    "descriptor": {"name": p.title, "long_desc": p.description},
                    "price": {"currency": "INR", "value": str(p.final_price)}
                })
            
            providers.append({
                "id": str(artisan_id),
                "descriptor": {"name": artisan.full_name if artisan else "Artisan"},
                "items": provider_items
            })
            
    catalog_response = {
        "context": {
            **context,
            "action": "on_search",
            "bpp_id": "junglemarket.com",
            "bpp_uri": "http://localhost:8000/ondc"
        },
        "message": {
            "catalog": {
                "bpp/descriptor": {
                    "name": "Jungle Market"
                },
                "bpp/providers": providers
            }
        }
    }
    
    await _send_callback(context.get("bap_uri"), "on_search", catalog_response)


async def _get_product(product_id: str):
    async with AsyncSessionLocal() as session:
        try:
            uid = uuid.UUID(product_id)
            return await session.get(Product, uid)
        except ValueError:
            return None

async def process_ondc_select(context: Dict[str, Any], order: Dict[str, Any]):
    # Process order items
    items = order.get("items", [])
    if not items:
        return

    product_id = items[0].get("id")
    product = await _get_product(product_id)
    if not product:
        print(f"[ONDC] Select: Product {product_id} not found!")
        return

    price_value = product.final_price
    
    select_response = {
        "context": {
            **context,
            "action": "on_select",
            "bpp_id": "junglemarket.com",
            "bpp_uri": "http://localhost:8000/ondc"
        },
        "message": {
            "order": {
                "provider": order.get("provider"),
                "items": items,
                "quote": {
                    "price": {"currency": "INR", "value": str(price_value)},
                    "breakdown": [
                        {"title": "Item Price", "price": {"currency": "INR", "value": str(price_value)}}
                    ]
                }
            }
        }
    }
    
    await _send_callback(context.get("bap_uri"), "on_select", select_response)


async def process_ondc_init(context: Dict[str, Any], order: Dict[str, Any]):
    items = order.get("items", [])
    if not items:
        return

    product_id = items[0].get("id")
    product = await _get_product(product_id)
    if not product:
        print(f"[ONDC] Init: Product {product_id} not found!")
        return

    price_value = product.final_price
    shipping_cost = 100.0  # Flat rate shipping logic
    total = price_value + shipping_cost
    
    init_response = {
        "context": {
            **context,
            "action": "on_init",
            "bpp_id": "junglemarket.com",
            "bpp_uri": "http://localhost:8000/ondc"
        },
        "message": {
            "order": {
                "provider": order.get("provider"),
                "items": order.get("items"),
                "billing": order.get("billing"),
                "fulfillments": order.get("fulfillments"),
                "quote": {
                    "price": {"currency": "INR", "value": str(total)},
                    "breakdown": [
                        {"title": "Item Price", "price": {"currency": "INR", "value": str(price_value)}},
                        {"title": "Shipping", "price": {"currency": "INR", "value": str(shipping_cost)}}
                    ]
                },
                "payment": {
                    "uri": "junglepay://mock-checkout",
                    "tl_method": "http/get",
                    "params": {"amount": str(total), "currency": "INR"},
                    "status": "NOT-PAID"
                }
            }
        }
    }
    
    await _send_callback(context.get("bap_uri"), "on_init", init_response)


async def process_ondc_confirm(context: Dict[str, Any], order: Dict[str, Any]):
    import uuid
    # Mocking order confirmation but keeping order info dynamic
    confirm_response = {
        "context": {
            **context,
            "action": "on_confirm",
            "bpp_id": "junglemarket.com",
            "bpp_uri": "http://localhost:8000/ondc"
        },
        "message": {
            "order": {
                **order,
                "id": f"ord_{uuid.uuid4().hex[:8]}",
                "state": "Created",
                "payment": {
                    **(order.get("payment") or {}),
                    "status": "PAID"
                }
            }
        }
    }
    
    await _send_callback(context.get("bap_uri"), "on_confirm", confirm_response)


async def process_ondc_status(context: Dict[str, Any], order_id: str):
    status_response = {
        "context": {
            **context,
            "action": "on_status",
            "bpp_id": "junglemarket.com",
            "bpp_uri": "http://localhost:8000/ondc"
        },
        "message": {
            "order": {
                "id": order_id,
                "state": "Packed"
            }
        }
    }
    await _send_callback(context.get("bap_uri"), "on_status", status_response)


async def process_ondc_cancel(context: Dict[str, Any], order_id: str, reason_id: str):
    cancel_response = {
        "context": {
            **context,
            "action": "on_cancel",
            "bpp_id": "junglemarket.com",
            "bpp_uri": "http://localhost:8000/ondc"
        },
        "message": {
            "order": {
                "id": order_id,
                "state": "Cancelled",
                "cancellation_reason_id": reason_id
            }
        }
    }
    await _send_callback(context.get("bap_uri"), "on_cancel", cancel_response)
