from typing import Literal

ErrorCode = Literal["FEATURE_SCHEMA_MISMATCH"]


class CyberPulseError(Exception):
    """Base for every typed engine/service error (coding-standards.md §3.2).

    The FastAPI layer maps subclasses exhaustively; nothing here is ever
    stringified straight into a client response (RULE-backend.md §Errors).
    """

    code: ErrorCode

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class FeatureSchemaMismatch(CyberPulseError):
    """The computed feature vector disagrees with the stored feature_schema.json.

    Raised before inference, never after — scoring a misaligned vector
    produces a confident wrong answer (ai/guardrails.md G-10).
    """

    code: ErrorCode = "FEATURE_SCHEMA_MISMATCH"

