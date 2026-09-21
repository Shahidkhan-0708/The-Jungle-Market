from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class Principal:
    user_id: UUID
    roles: set[str]
    email: str | None = None
    full_name: str | None = None

    def has_role(self, role: str) -> bool:
        return role in self.roles
