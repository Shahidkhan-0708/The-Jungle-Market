from enum import Enum

class RoleEnum(str, Enum):
    ADMIN = "ADMIN"
    AMBASSADOR = "AMBASSADOR"
    ARTISAN = "ARTISAN"
    BUYER = "BUYER"
