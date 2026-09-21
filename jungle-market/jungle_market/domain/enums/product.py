from enum import Enum

class ProductStatus(str, Enum):
    DRAFT = "DRAFT"
    AI_PROCESSING = "AI_PROCESSING"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    VERIFIED = "VERIFIED"
    RISK_REVIEW = "RISK_REVIEW"
    PUBLISHED = "PUBLISHED"
    SUSPENDED = "SUSPENDED"
    SOLD_OUT = "SOLD_OUT"
    ARCHIVED = "ARCHIVED"

class FactSource(str, Enum):
    VISION = "vision"
    VOICE = "voice"
    MEASURED_VERIFIED = "measured_verified"
    SELF_REPORTED = "self_reported"
    AMBASSADOR_VERIFIED = "ambassador_verified"

class VerificationState(str, Enum):
    PENDING = "PENDING"
    VERIFIED_AI = "VERIFIED_AI"
    VERIFIED_HUMAN = "VERIFIED_HUMAN"
    REJECTED = "REJECTED"
    CONFLICT = "CONFLICT"

class Category(str, Enum):
    BASKET = "basket"
    POTTERY = "pottery"
    TEXTILE = "textile"
    JEWELLERY = "jewellery"
    WOODCRAFT = "woodcraft"
    BAMBOO_CRAFT = "bamboo_craft"
    DECOR = "decor"
    BAG = "bag"
    ACCESSORY = "accessory"

class Material(str, Enum):
    BAMBOO = "bamboo"
    WOOD = "wood"
    CLAY = "clay"
    COTTON = "cotton"
    JUTE = "jute"
    METAL = "metal"
    LEATHER = "leather"
