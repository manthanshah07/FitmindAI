from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Test that the /health endpoint returns 200 OK and status 'ok'."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
