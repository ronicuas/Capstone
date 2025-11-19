import pytest
from rest_framework.test import APIClient

@pytest.fixture
def api_client(db):
    return APIClient()
