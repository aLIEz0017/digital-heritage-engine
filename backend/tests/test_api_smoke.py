import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./.pytest_app.db")
os.environ.setdefault("CORS_STRICT", "true")

from fastapi.testclient import TestClient

from app.main import app


def test_root_endpoint_returns_project_info():
    with TestClient(app) as client:
        response = client.get("/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["message"]
    assert "非遗数字生命互动引擎" in payload["message"]


def test_health_endpoint_returns_healthy_status():
    with TestClient(app) as client:
        response = client.get("/api/v1/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload.get("status") == "healthy"