from copy import deepcopy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from src.app import activities, app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def restore_activities():
    original_activities = deepcopy(activities)
    yield
    activities.clear()
    activities.update(original_activities)


def _signup_url(activity_name):
    return f"/activities/{quote(activity_name, safe='')}/signup"


def test_signup_adds_participant_to_activity_list(client):
    # Arrange
    activity_name = "Art Club"
    email = "new-student@example.com"

    # Act
    response = client.post(_signup_url(activity_name), params={"email": email})
    activities_response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Signed up {email} for {activity_name}"}
    assert email in activities_response.json()[activity_name]["participants"]


def test_signup_rejects_duplicate_participant(client):
    # Arrange
    activity_name = "Art Club"
    email = "student@example.com"
    activities[activity_name]["participants"].append(email)

    # Act
    response = client.post(_signup_url(activity_name), params={"email": email})

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Student is already signed up for this activity"
    assert activities[activity_name]["participants"].count(email) == 1


def test_signup_rejects_unknown_activity(client):
    # Arrange
    activity_name = "Unknown Activity"

    # Act
    response = client.post(_signup_url(activity_name), params={"email": "student@example.com"})

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_signup_rejects_full_activity(client):
    # Arrange
    activity_name = "Art Club"
    activity = activities[activity_name]
    activity["max_participants"] = len(activity["participants"])
    email = "new-student@example.com"

    # Act
    response = client.post(_signup_url(activity_name), params={"email": email})

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Activity is full"
    assert email not in activity["participants"]


def test_unregister_removes_participant_from_activity_list(client):
    # Arrange
    activity_name = "Art Club"
    email = "student@example.com"
    activities[activity_name]["participants"].append(email)

    # Act
    response = client.delete(_signup_url(activity_name), params={"email": email})
    activities_response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Unregistered {email} from {activity_name}"}
    assert email not in activities_response.json()[activity_name]["participants"]


def test_unregister_rejects_missing_participant(client):
    # Arrange
    activity_name = "Art Club"
    email = "missing-student@example.com"

    # Act
    response = client.delete(_signup_url(activity_name), params={"email": email})

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Student is not signed up for this activity"


def test_unregister_rejects_unknown_activity(client):
    # Arrange
    activity_name = "Unknown Activity"

    # Act
    response = client.delete(
        _signup_url(activity_name), params={"email": "student@example.com"}
    )

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"