class AIException(Exception):
    """Base exception for all AI provider operations."""
    def __init__(self, message: str = "AI provider error occurred"):
        self.message = message
        super().__init__(self.message)


class AIMissingAPIKeyError(AIException):
    """Raised when the AI provider API key is missing or blank."""
    def __init__(self, message: str = "AI API key is missing or unconfigured"):
        super().__init__(message)


class AIAuthenticationError(AIException):
    """Raised when AI provider authentication fails (e.g. invalid API key)."""
    def __init__(self, message: str = "AI authentication failed"):
        super().__init__(message)


class AITimeoutError(AIException):
    """Raised when an AI provider request times out."""
    def __init__(self, message: str = "AI request timed out"):
        super().__init__(message)


class AIRateLimitError(AIException):
    """Raised when AI provider rate limits are exceeded."""
    def __init__(self, message: str = "AI rate limit exceeded"):
        super().__init__(message)


class AIProviderUnavailableError(AIException):
    """Raised when the AI provider service is down or unreachable."""
    def __init__(self, message: str = "AI provider is currently unavailable"):
        super().__init__(message)


class AIResponseError(AIException):
    """Raised when the AI provider returns an empty or malformed response."""
    def __init__(self, message: str = "AI provider returned an invalid or empty response"):
        super().__init__(message)
