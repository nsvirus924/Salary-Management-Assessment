from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_serves_spa_with_fallback_but_not_for_api(tmp_path, engine):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<div id=root></div>")
    (tmp_path / "assets" / "app.js").write_text("console.log(1)")
    app = create_app(Settings(database_url="sqlite://", frontend_dist=tmp_path, cors_origins=[]), engine=engine)

    with TestClient(app) as client:
        assert "root" in client.get("/employees").text          # client-side route
        assert client.get("/assets/app.js").status_code == 200  # static asset
        assert client.get("/api/nope").status_code == 404       # API stays JSON 404
        # A path outside dist must never be served as a file; it falls back to index.html.
        assert client.get("/%2e%2e/%2e%2e/etc/passwd").text == "<div id=root></div>"
