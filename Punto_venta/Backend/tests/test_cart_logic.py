# tests/test_cart_logic.py
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from model_bakery import baker

User = get_user_model()


def autenticar_como(api_client, nombre_usuario="vendedor", contrasena="1234"):
    """Crea y autentica un usuario, devolviendo un cliente API autorizado."""
    User.objects.create_user(username=nombre_usuario, password=contrasena)
    token = api_client.post("/api/token/", {"username": nombre_usuario, "password": contrasena}, format="json")
    assert token.status_code == 200
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.json()['access']}")


# ──────────────────────────────────────────────────────────────────────────────
# Pruebas de permisos y creación de órdenes
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_creacion_orden_sin_rol(api_client):
    """Usuario autenticado sin grupo 'vendedor' o 'admin' => 403."""
    autenticar_como(api_client)

    producto = baker.make("api.Product", price=Decimal("1000"), stock=5)
    datos = {
        "payment_method": "efectivo",
        "items": [{"product_id": producto.id, "quantity": 1}],
    }

    respuesta = api_client.post("/api/orders/", datos, format="json")
    assert respuesta.status_code == 403


@pytest.mark.django_db
def test_creacion_orden_y_descuento_stock(api_client):
    """Con grupo 'vendedor' => crea orden, total correcto y stock disminuye."""
    usuario = User.objects.create_user(username="vendedor", password="1234")
    grupo, _ = Group.objects.get_or_create(name="vendedor")
    usuario.groups.add(grupo)
    usuario.save()

    token = api_client.post("/api/token/", {"username": "vendedor", "password": "1234"}, format="json")
    assert token.status_code == 200
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.json()['access']}")

    producto1 = baker.make("api.Product", price=Decimal("2000"), stock=10)
    producto2 = baker.make("api.Product", price=Decimal("3000"), stock=10)

    datos = {
        "payment_method": "efectivo",
        "items": [
            {"product_id": producto1.id, "quantity": 1},
            {"product_id": producto2.id, "quantity": 2},
        ],
    }

    respuesta = api_client.post("/api/orders/", datos, format="json")
    assert respuesta.status_code in (200, 201), f"status={respuesta.status_code}, body={getattr(respuesta,'data',None) or respuesta.content}"

    data = respuesta.json()
    total_esperado = Decimal("2000") + Decimal("3000") * 2
    assert Decimal(str(data.get("total"))) == total_esperado

    # Verificar que el stock se haya actualizado correctamente
    from api.models import Product
    producto1_actualizado = Product.objects.get(pk=producto1.id)
    producto2_actualizado = Product.objects.get(pk=producto2.id)
    assert producto1_actualizado.stock == 9
    assert producto2_actualizado.stock == 8


@pytest.mark.django_db
def test_creacion_orden_con_stock_insuficiente(api_client):
    """Debe fallar con 400 si la cantidad solicitada excede el stock."""
    usuario = User.objects.create_user(username="vendedor", password="1234")
    grupo, _ = Group.objects.get_or_create(name="vendedor")
    usuario.groups.add(grupo)
    usuario.save()

    token = api_client.post("/api/token/", {"username": "vendedor", "password": "1234"}, format="json")
    assert token.status_code == 200
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.json()['access']}")

    producto = baker.make("api.Product", price=Decimal("1500"), stock=1)
    datos = {
        "payment_method": "efectivo",
        "items": [{"product_id": producto.id, "quantity": 2}],  # mayor que el stock
    }

    respuesta = api_client.post("/api/orders/", datos, format="json")
    assert respuesta.status_code == 400
    assert b"Stock insuficiente" in (respuesta.content or b"")


# ──────────────────────────────────────────────────────────────────────────────
# Validaciones adicionales
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
@pytest.mark.parametrize("cantidad_invalida", [0, -1])
def test_orden_cantidad_invalida_no_modifica_stock(api_client, cantidad_invalida):
    """Si la cantidad es 0 o negativa, debe devolver 400 y no modificar stock."""
    usuario = User.objects.create_user(username="vendedor_cant", password="1234")
    grupo, _ = Group.objects.get_or_create(name="vendedor")
    usuario.groups.add(grupo)
    usuario.save()

    token = api_client.post("/api/token/", {"username": "vendedor_cant", "password": "1234"}, format="json")
    assert token.status_code == 200
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.json()['access']}")

    producto = baker.make("api.Product", price=Decimal("1990"), stock=7)
    datos = {
        "payment_method": "efectivo",
        "items": [{"product_id": producto.id, "quantity": cantidad_invalida}],
    }

    respuesta = api_client.post("/api/orders/", datos, format="json")
    assert respuesta.status_code == 400

    from api.models import Product
    producto_refrescado = Product.objects.get(pk=producto.id)
    assert producto_refrescado.stock == 7  # no cambia


@pytest.mark.django_db
def test_orden_rollback_si_un_item_falla(api_client):
    """Si un ítem falla por falta de stock, ningún producto debe ser modificado."""
    usuario = User.objects.create_user(username="vendedor_rb", password="1234")
    grupo, _ = Group.objects.get_or_create(name="vendedor")
    usuario.groups.add(grupo)
    usuario.save()

    token = api_client.post("/api/token/", {"username": "vendedor_rb", "password": "1234"}, format="json")
    assert token.status_code == 200
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.json()['access']}")

    producto_ok = baker.make("api.Product", price=Decimal("1000"), stock=5)
    producto_falla = baker.make("api.Product", price=Decimal("1500"), stock=1)

    datos = {
        "payment_method": "efectivo",
        "items": [
            {"product_id": producto_ok.id, "quantity": 1},   # válido
            {"product_id": producto_falla.id, "quantity": 2},  # falla por stock
        ],
    }

    respuesta = api_client.post("/api/orders/", datos, format="json")
    assert respuesta.status_code == 400

    from api.models import Product
    producto_ok_ref = Product.objects.get(pk=producto_ok.id)
    producto_falla_ref = Product.objects.get(pk=producto_falla.id)
    assert producto_ok_ref.stock == 5
    assert producto_falla_ref.stock == 1


# ──────────────────────────────────────────────────────────────────────────────
# Historia de usuario: actualización automática del stock
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_descuento_stock_en_venta(api_client):
    """Al registrar una venta, el stock se descuenta automáticamente según la cantidad vendida."""
    # Usuario con rol vendedor
    usuario = User.objects.create_user(username="vendedor_stock", password="1234")
    grupo, _ = Group.objects.get_or_create(name="vendedor")
    usuario.groups.add(grupo)
    usuario.save()

    # Autenticación
    token = api_client.post("/api/token/", {"username": "vendedor_stock", "password": "1234"}, format="json")
    assert token.status_code == 200
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.json()['access']}")

    # Productos iniciales
    producto1 = baker.make("api.Product", price=Decimal("2500"), stock=3)  # quedará en 1
    producto2 = baker.make("api.Product", price=Decimal("1000"), stock=2)  # quedará en 0

    datos = {
        "payment_method": "efectivo",
        "items": [
            {"product_id": producto1.id, "quantity": 2},
            {"product_id": producto2.id, "quantity": 2},
        ],
    }

    respuesta = api_client.post("/api/orders/", datos, format="json")
    assert respuesta.status_code in (200, 201), (respuesta.status_code, respuesta.content)

    # Verificar que el stock se haya actualizado correctamente
    from api.models import Product
    producto1_actualizado = Product.objects.get(pk=producto1.id)
    producto2_actualizado = Product.objects.get(pk=producto2.id)

    assert producto1_actualizado.stock == 1   # 3 - 2
    assert producto2_actualizado.stock == 0   # 2 - 2
