from dataclasses import dataclass
from datetime import UTC, datetime

from jungle_market.domain.enums import ModelStatus


@dataclass
class RegisteredModel:
    model_name: str
    version: str
    artifact_uri: str
    status: ModelStatus
    metrics: dict
    previous_stable_version: str | None = None
    promoted_at: datetime | None = None


class InMemoryModelRegistry:
    def __init__(self) -> None:
        self.models: dict[tuple[str, str], RegisteredModel] = {}
        self.production_routes: dict[str, str] = {}

    def register(self, model: RegisteredModel) -> None:
        self.models[(model.model_name, model.version)] = model

    def get_production(self, model_name: str) -> RegisteredModel | None:
        version = self.production_routes.get(model_name)
        if version is None:
            return None
        return self.models[(model_name, version)]

    def promote(self, model_name: str, candidate_version: str) -> RegisteredModel:
        candidate = self.models[(model_name, candidate_version)]
        previous = self.production_routes.get(model_name)
        if previous:
            self.models[(model_name, previous)].status = ModelStatus.RETIRED
        candidate.status = ModelStatus.PRODUCTION
        candidate.previous_stable_version = previous
        candidate.promoted_at = datetime.now(UTC)
        self.production_routes[model_name] = candidate_version
        return candidate

    def rollback(self, model_name: str) -> RegisteredModel:
        current = self.get_production(model_name)
        if current is None or current.previous_stable_version is None:
            raise ValueError("no previous stable model available")
        current.status = ModelStatus.CANDIDATE
        previous = self.models[(model_name, current.previous_stable_version)]
        previous.status = ModelStatus.PRODUCTION
        self.production_routes[model_name] = previous.version
        return previous
