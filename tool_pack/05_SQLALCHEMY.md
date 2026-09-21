# SQLAlchemy

> **Purpose:** Typed persistence layer over PostgreSQL.

## Requirements
- separate ORM models from Pydantic schemas
- repositories/services for complex workflows
- explicit transactions
- clean relationships and constraints

## Do not
- place CV/ML/business rules inside ORM models
- scatter raw SQL everywhere without need
