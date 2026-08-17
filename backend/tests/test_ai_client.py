from unittest.mock import MagicMock, patch
import pytest
from google.genai.errors import APIError

from app.core.config import settings
from app.core.ai_client import AIClient
from app.core.ai_exceptions import (
    AIException,
    AIMissingAPIKeyError,
    AIAuthenticationError,
    AITimeoutError,
    AIRateLimitError,
    AIProviderUnavailableError,
    AIResponseError,
)
from app.schemas.ai import LLMMessage, LLMCompletionRequest, LLMCompletionResponse


@pytest.fixture
def valid_request():
    return LLMCompletionRequest(
        messages=[
            LLMMessage(role="system", content="You are a helpful assistant."),
            LLMMessage(role="user", content="Hello Gemini"),
        ],
        temperature=0.7,
        max_tokens=100,
    )


@pytest.fixture
def mock_gemini_response():
    mock_resp = MagicMock()
    mock_resp.text = "Mocked Gemini completion output"
    
    mock_candidate = MagicMock()
    mock_candidate.finish_reason = "STOP"
    mock_resp.candidates = [mock_candidate]
    
    mock_usage = MagicMock()
    mock_usage.prompt_token_count = 12
    mock_usage.candidates_token_count = 20
    mock_usage.total_token_count = 32
    mock_resp.usage_metadata = mock_usage
    
    return mock_resp


# 1. Test Client Initialization with Defaults and Overrides
def test_client_initialization_defaults_and_overrides():
    client_default = AIClient()
    assert client_default.model == settings.GEMINI_MODEL
    assert client_default.model == "gemini-2.5-flash-lite"
    assert client_default.timeout_seconds == settings.GEMINI_TIMEOUT_SECONDS

    client_custom = AIClient(
        api_key="AIzaSyTestCustomKey",
        model="gemini-2.5-flash-custom",
        timeout_seconds=45.0,
    )
    assert client_custom.api_key == "AIzaSyTestCustomKey"
    assert client_custom.model == "gemini-2.5-flash-custom"
    assert client_custom.timeout_seconds == 45.0


# 2. Test Configured Model is Used
def test_configured_model_used(valid_request, mock_gemini_response):
    client = AIClient(api_key="AIzaSyTestKey", model="gemini-2.5-flash-lite")
    
    with patch("app.core.ai_client.genai.Client") as mock_genai_cls:
        mock_instance = MagicMock()
        mock_instance.models.generate_content.return_value = mock_gemini_response
        mock_genai_cls.return_value = mock_instance
        
        resp = client.generate_completion(valid_request)
        
        mock_instance.models.generate_content.assert_called_once()
        call_kwargs = mock_instance.models.generate_content.call_args.kwargs
        assert call_kwargs["model"] == "gemini-2.5-flash-lite"
        assert resp.content == "Mocked Gemini completion output"


# 3. Test Configured Timeout Respected
def test_configured_timeout_respected():
    client = AIClient(api_key="AIzaSyTestKey", timeout_seconds=15.0)
    
    with patch("app.core.ai_client.genai.Client") as mock_genai_cls:
        _ = client._get_client()
        mock_genai_cls.assert_called_once()
        call_kwargs = mock_genai_cls.call_args.kwargs
        assert call_kwargs["api_key"] == "AIzaSyTestKey"
        assert call_kwargs["http_options"].timeout == 15000


# 4. Test Successful Completion Normalized Correctly
def test_successful_completion_normalized(valid_request, mock_gemini_response):
    client = AIClient(api_key="AIzaSyTestKey")
    
    with patch("app.core.ai_client.genai.Client") as mock_genai_cls:
        mock_instance = MagicMock()
        mock_instance.models.generate_content.return_value = mock_gemini_response
        mock_genai_cls.return_value = mock_instance
        
        resp = client.generate_completion(valid_request)
        
        assert isinstance(resp, LLMCompletionResponse)
        assert resp.content == "Mocked Gemini completion output"
        assert resp.model == "gemini-2.5-flash-lite"
        assert resp.finish_reason == "STOP"
        assert resp.prompt_tokens == 12
        assert resp.completion_tokens == 20
        assert resp.total_tokens == 32


# 5. Test Missing API Key Handled Correctly
def test_missing_api_key_handled(valid_request):
    client = AIClient(api_key=None)
    with patch("app.core.ai_client.settings.GEMINI_API_KEY", None):
        with pytest.raises(AIMissingAPIKeyError) as exc_info:
            client.generate_completion(valid_request)
        assert "API key is missing" in str(exc_info.value)


# 6. Test Authentication Failure Handled
def test_authentication_failure_handled(valid_request):
    client = AIClient(api_key="AIzaSyInvalidKey")
    
    with patch("app.core.ai_client.genai.Client") as mock_genai_cls:
        mock_instance = MagicMock()
        err = APIError(401, {"error": {"message": "API_KEY_INVALID: Invalid API Key", "code": 401}})
        mock_instance.models.generate_content.side_effect = err
        mock_genai_cls.return_value = mock_instance
        
        with pytest.raises(AIAuthenticationError) as exc_info:
            client.generate_completion(valid_request)
        assert "authentication failed" in str(exc_info.value).lower()


# 7. Test Timeout Handled
def test_timeout_handled(valid_request):
    client = AIClient(api_key="AIzaSyTestKey")
    
    with patch("app.core.ai_client.genai.Client") as mock_genai_cls:
        mock_instance = MagicMock()
        mock_instance.models.generate_content.side_effect = TimeoutError("Deadline exceeded")
        mock_genai_cls.return_value = mock_instance
        
        with pytest.raises(AITimeoutError) as exc_info:
            client.generate_completion(valid_request)
        assert "timed out" in str(exc_info.value).lower()


# 8. Test Rate Limit Error Handled (Free-Tier Safety)
def test_rate_limit_handled(valid_request):
    client = AIClient(api_key="AIzaSyTestKey")
    
    with patch("app.core.ai_client.genai.Client") as mock_genai_cls:
        mock_instance = MagicMock()
        err = APIError(429, {"error": {"message": "RESOURCE_EXHAUSTED: Rate limit exceeded", "code": 429}})
        mock_instance.models.generate_content.side_effect = err
        mock_genai_cls.return_value = mock_instance
        
        with pytest.raises(AIRateLimitError) as exc_info:
            client.generate_completion(valid_request)
        assert "rate limit" in str(exc_info.value).lower() or "quota" in str(exc_info.value).lower()


# 9. Test Provider Unavailable Handled
def test_provider_unavailable_handled(valid_request):
    client = AIClient(api_key="AIzaSyTestKey")
    
    with patch("app.core.ai_client.genai.Client") as mock_genai_cls:
        mock_instance = MagicMock()
        err = APIError(500, {"error": {"message": "Internal Server Error", "code": 500}})
        mock_instance.models.generate_content.side_effect = err
        mock_genai_cls.return_value = mock_instance
        
        with pytest.raises(AIProviderUnavailableError) as exc_info:
            client.generate_completion(valid_request)
        assert "unavailable" in str(exc_info.value).lower()



# 10. Test Malformed/Empty Response Handled Safely
@pytest.mark.parametrize(
    "bad_response",
    [
        None,
        MagicMock(text=None),
        MagicMock(text="   "),
    ],
)
def test_malformed_empty_response_handled(valid_request, bad_response):
    client = AIClient(api_key="AIzaSyTestKey")
    
    with patch("app.core.ai_client.genai.Client") as mock_genai_cls:
        mock_instance = MagicMock()
        mock_instance.models.generate_content.return_value = bad_response
        mock_genai_cls.return_value = mock_instance
        
        with pytest.raises(AIResponseError) as exc_info:
            client.generate_completion(valid_request)
        assert "empty" in str(exc_info.value).lower()


# 11. Test Provider-Neutral Interface Behavior & Alias
def test_provider_neutral_interface_behavior(valid_request, mock_gemini_response):
    client = AIClient(api_key="AIzaSyTestKey")
    
    with patch("app.core.ai_client.genai.Client") as mock_genai_cls:
        mock_instance = MagicMock()
        mock_instance.models.generate_content.return_value = mock_gemini_response
        mock_genai_cls.return_value = mock_instance
        
        resp = client.generate(valid_request)
        assert isinstance(resp, LLMCompletionResponse)
        assert resp.content == "Mocked Gemini completion output"


# 12. Test No Raw SDK Objects Leak Through Response
def test_no_sdk_objects_leak(valid_request, mock_gemini_response):
    client = AIClient(api_key="AIzaSyTestKey")
    
    with patch("app.core.ai_client.genai.Client") as mock_genai_cls:
        mock_instance = MagicMock()
        mock_instance.models.generate_content.return_value = mock_gemini_response
        mock_genai_cls.return_value = mock_instance
        
        resp = client.generate_completion(valid_request)
        
        # Ensure returned object is strictly Pydantic model
        assert type(resp) is LLMCompletionResponse
        assert type(resp.content) is str
        assert "google" not in type(resp).__module__
        assert "genai" not in type(resp).__module__
