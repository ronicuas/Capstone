import pytest
from django.contrib.auth.models import User

@pytest.mark.django_db
def test_login_ok(api_client):
    User.objects.create_user(username="vendedor", password="1234")

    # SimpleJWT: login se hace en /api/token/
    url = "/api/token/"
    r = api_client.post(url, {"username": "vendedor", "password": "1234"}, format="json")

    assert r.status_code == 200
    data = r.json()
    # SimpleJWT devuelve 'access' y 'refresh'
    assert "access" in data
    assert "refresh" in data


@pytest.mark.django_db
def test_login_malo(api_client):
    url = "/api/token/"
    r = api_client.post(url, {"username": "noexiste", "password": "mala"}, format="json")
    assert r.status_code == 401
