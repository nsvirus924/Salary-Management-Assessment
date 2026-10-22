from tests.conftest import employee_payload


def test_insight_endpoints_respond(client):
    for i, salary in enumerate((100_000, 120_000)):
        client.post("/api/employees", json=employee_payload(email=f"e{i}@x.io", salary=salary))

    overview = client.get("/api/insights/overview").json()
    assert overview["headcount"] == 2

    breakdown = client.get("/api/insights/breakdown",
                           params={"group_by": "department", "country": "US"}).json()
    assert breakdown["groups"][0]["name"] == "Engineering"

    dist = client.get("/api/insights/distribution", params={"bins": 2}).json()
    assert sum(b["count"] for b in dist["buckets"]) == 2

    peers = client.get("/api/employees/1/peer-comparison").json()
    assert peers["peer_count"] == 1


def test_breakdown_rejects_invalid_group(client):
    assert client.get("/api/insights/breakdown", params={"group_by": "salary"}).status_code == 422
