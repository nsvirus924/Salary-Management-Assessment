from tests.conftest import employee_payload


def create(client, **overrides):
    response = client.post("/api/employees", json=employee_payload(**overrides))
    assert response.status_code == 201, response.text
    return response.json()


def test_create_then_fetch(client):
    created = create(client, country_code="GB", salary=70_000)
    fetched = client.get(f"/api/employees/{created['id']}").json()
    assert fetched["currency"] == "GBP"
    assert fetched["salary_usd"] == round(70_000 * 1.27)


def test_create_validates_payload(client):
    response = client.post("/api/employees", json=employee_payload(salary=-5, email="nope"))
    assert response.status_code == 422
    fields = {err["loc"][-1] for err in response.json()["detail"]}
    assert {"salary", "email"} <= fields


def test_domain_errors_map_to_http_status(client):
    create(client, email="dup@acme.example")
    assert client.post("/api/employees", json=employee_payload(email="dup@acme.example")).status_code == 409
    assert client.post("/api/employees", json=employee_payload(country_code="ZZ")).status_code == 422
    assert client.get("/api/employees/999").status_code == 404


def test_list_filters_sorts_and_paginates(client):
    create(client, email="a@x.io", last_name="Adams", country_code="US", salary=100_000)
    create(client, email="b@x.io", last_name="Brown", country_code="US", salary=200_000)
    create(client, email="c@x.io", last_name="Chen", country_code="SG", salary=150_000)

    body = client.get("/api/employees", params={"country": "US", "sort": "salary",
                                                "order": "desc", "page_size": 1}).json()
    assert body["total"] == 2
    assert [e["last_name"] for e in body["items"]] == ["Brown"]


def test_list_rejects_bad_query_params(client):
    assert client.get("/api/employees", params={"page_size": 1000}).status_code == 422
    assert client.get("/api/employees", params={"sort": "secret"}).status_code == 422


def test_patch_salary_appends_history(client):
    emp = create(client, salary=100_000)
    response = client.patch(f"/api/employees/{emp['id']}",
                            json={"salary": 108_000, "salary_change_reason": "Promotion"})
    assert response.status_code == 200
    history = client.get(f"/api/employees/{emp['id']}/salary-history").json()
    assert [h["new_salary"] for h in history] == [108_000, 100_000]
    assert history[0]["reason"] == "Promotion"


def test_delete(client):
    emp = create(client)
    assert client.delete(f"/api/employees/{emp['id']}").status_code == 204
    assert client.get(f"/api/employees/{emp['id']}").status_code == 404


def test_meta_lists_filter_options(client):
    create(client, department="Sales", job_title="Account Executive")
    body = client.get("/api/meta").json()
    assert "Sales" in body["departments"]
    assert "Account Executive" in body["job_titles"]
    assert {c["code"] for c in body["countries"]} >= {"US", "IN", "JP"}
    assert body["employment_types"] == ["full_time", "part_time", "contractor"]
