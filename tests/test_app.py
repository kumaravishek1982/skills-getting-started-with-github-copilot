from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


@pytest.fixture
def client():
    return TestClient(app)


def test_get_activities(client):
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    assert "Soccer Team" in data


def test_signup_and_remove(client):
    activity = "Soccer Team"
    email = "pytest.user@example.com"
    # ensure test email not present at start
    participants = activities[activity]["participants"]
    if email in participants:
        participants.remove(email)

    # signup
    url = f"/activities/{quote(activity)}/signup?email={quote(email)}"
    resp = client.post(url)
    assert resp.status_code == 200
    assert email in activities[activity]["participants"]

    # remove
    url2 = f"/activities/{quote(activity)}/participant?email={quote(email)}"
    resp2 = client.delete(url2)
    assert resp2.status_code == 200
    assert email not in activities[activity]["participants"]


def test_duplicate_signup(client):
    activity = "Soccer Team"
    existing = activities[activity]["participants"][0]
    url = f"/activities/{quote(activity)}/signup?email={quote(existing)}"
    resp = client.post(url)
    assert resp.status_code == 400
