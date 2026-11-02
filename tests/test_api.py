import pytest
from app import create_app
from core import db, User


@pytest.fixture
def app(tmp_path):
    return create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-only-secret-at-least-thirty-two-characters",
            "SQLALCHEMY_DATABASE_URI": "sqlite:///" + str(tmp_path / "test.db"),
        }
    )


def client(app):
    c = app.test_client()
    c.csrf = c.get("/api/session").json["csrf"]
    return c


def call(c, path, method="GET", body=None):
    r = c.open(
        "/api" + path, method=method, json=body, headers={"X-CSRF-Token": c.csrf}
    )
    if r.is_json and isinstance(r.json, dict) and r.json.get("csrf"):
        c.csrf = r.json["csrf"]
    return r


def register(c, email="person@example.com"):
    r = call(
        c,
        "/register",
        "POST",
        {
            "name": "Test person",
            "email": email,
            "password": "test-password-123",
            "admin": True,
        },
    )
    assert r.status_code == 201
    assert r.json["user"]["admin"] is False
    return r.json["user"]


def test_drafts_publication_comments_and_ownership(app):
    a, b = client(app), client(app)
    register(a)
    register(b, "reader@example.com")
    draft = {
        "title": "A private draft",
        "body": "Private writing.",
        "topic": "Design",
        "published": False,
    }
    r = call(a, "/posts", "POST", draft)
    assert r.status_code == 201
    pid = r.json["id"]
    assert call(b, f"/posts/{pid}").status_code == 404
    assert call(a, f"/posts/{pid}").status_code == 200
    assert call(b, f"/posts/{pid}/comments", "POST", {"body": "No"}).status_code == 404
    assert call(b, "/posts").json == []
    draft["published"] = True
    assert call(a, f"/posts/{pid}", "PUT", draft).status_code == 200
    assert call(b, f"/posts/{pid}", "PUT", draft).status_code == 403
    r = call(b, f"/posts/{pid}/comments", "POST", {"body": "A reader comment"})
    assert r.status_code == 201
    cid = r.json["id"]
    assert call(a, f"/comments/{cid}", "DELETE").status_code == 403
    assert call(b, f"/comments/{cid}", "DELETE").status_code == 200
    assert call(a, f"/posts/{pid}", "DELETE").status_code == 200
    assert call(b, f"/posts/{pid}").status_code == 404
