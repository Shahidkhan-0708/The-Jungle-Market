import logging
import sys
from typing import Any


def configure_logging(level: str = "INFO") -> None:
    logging.basicConfig(
        level=level.upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )


def log_event(logger: logging.Logger, event: str, **fields: Any) -> None:
    details = " ".join(f"{key}={value}" for key, value in sorted(fields.items()))
    logger.info("%s %s", event, details)
