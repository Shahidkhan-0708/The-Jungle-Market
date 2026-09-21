from jungle_market.domain.enums import ModelStatus
from jungle_market.ml.registry.service import InMemoryModelRegistry


class RolloutController:
    def __init__(self, registry: InMemoryModelRegistry) -> None:
        self.registry = registry

    def start_shadow(self, model_name: str, version: str) -> None:
        self.registry.models[(model_name, version)].status = ModelStatus.SHADOW

    def start_canary(self, model_name: str, version: str) -> None:
        self.registry.models[(model_name, version)].status = ModelStatus.CANARY

    def promote_if_passed(self, model_name: str, version: str, passed: bool) -> str:
        if not passed:
            return self.registry.rollback(model_name).version
        return self.registry.promote(model_name, version).version

    def rollback_failed_canary(self, model_name: str) -> str:
        return self.registry.rollback(model_name).version
