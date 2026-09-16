import logging
import sys

import structlog

# engineering/logging-monitoring.md §5. Structured JSON lines, one event per
# line, every line correlated by requestId. No request bodies, no user text —
# subject identifiers live in the web app's audit_events, not here.
_LEVELS = {"debug": logging.DEBUG, "info": logging.INFO, "warn": logging.WARNING, "error": logging.ERROR}


def configure_logging(level: str) -> None:
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=_LEVELS.get(level, logging.INFO))
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", key="ts"),
            structlog.processors.EventRenamer("msg"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(_LEVELS.get(level, logging.INFO)),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(**bind: object) -> structlog.typing.FilteringBoundLogger:
    # Matches the wrapper_class configured above — structlog.stdlib.BoundLogger
    # would be the wrong type here since this service doesn't use the stdlib
    # integration.
    logger: structlog.typing.FilteringBoundLogger = structlog.get_logger()
    return logger.bind(service="ml-service", **bind)
