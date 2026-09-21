from dataclasses import dataclass

from jungle_market.services.catalog.service import CatalogDocument


@dataclass
class SearchFilter:
    keyword: str | None = None
    category: str | None = None
    material: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    availability: bool | None = True
    region: str | None = None


class InMemorySearchIndex:
    def __init__(self) -> None:
        self.documents: dict[str, CatalogDocument] = {}

    def upsert(self, document: CatalogDocument) -> None:
        self.documents[str(document.product_id)] = document

    def remove(self, product_id: str) -> None:
        self.documents.pop(product_id, None)

    def search(self, filters: SearchFilter) -> list[CatalogDocument]:
        results = list(self.documents.values())
        if filters.keyword:
            needle = filters.keyword.lower()
            results = [item for item in results if needle in item.search_text.lower()]
        if filters.category:
            results = [item for item in results if item.category == filters.category]
        if filters.material:
            results = [item for item in results if item.dominant_material == filters.material]
        if filters.min_price is not None:
            results = [
                item
                for item in results
                if item.price is not None and item.price >= filters.min_price
            ]
        if filters.max_price is not None:
            results = [
                item
                for item in results
                if item.price is not None and item.price <= filters.max_price
            ]
        if filters.availability is not None:
            results = [item for item in results if item.available == filters.availability]
        if filters.region:
            results = [item for item in results if item.region == filters.region]
        return results
