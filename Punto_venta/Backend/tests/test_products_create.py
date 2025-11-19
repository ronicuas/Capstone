# tests/test_products_create.py
import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from model_bakery import baker

User = get_user_model()
CREATE_URL = "/api/products/"   # Ruta de creación de productos


def iniciar_sesion(api_client, nombre_usuario, contrasena, grupos=()):
    """Crea un usuario, asigna grupos y devuelve un cliente autenticado con JWT."""
    usuario = User.objects.create_user(username=nombre_usuario, password=contrasena)
    for nombre_grupo in grupos:
        grupo, _ = Group.objects.get_or_create(name=nombre_grupo)
        usuario.groups.add(grupo)
    usuario.save()
    token = api_client.post("/api/token/", {"username": nombre_usuario, "password": contrasena}, format="json")
    assert token.status_code == 200
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.json()['access']}")


# ──────────────────────────────────────────────────────────────────────────────
# Permisos y creación de productos
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_crear_producto_prohibido_para_vendedor(api_client):
    """Rol 'vendedor' NO puede crear productos -> 403."""
    iniciar_sesion(api_client, "vendedor1", "1234", grupos=("vendedor",))
    categoria = baker.make("api.Category")

    datos = {
        "name": "Teclado",
        "sku": "TEC-001",
        "category_id": str(categoria.id),
        "price": 9990,
        "stock": 10,
    }
    respuesta = api_client.post(CREATE_URL, datos, format="multipart")
    assert respuesta.status_code == 403, respuesta.content


@pytest.mark.django_db
@pytest.mark.parametrize("rol", ["admin", "bodeguero"])
def test_crear_producto_correcto_por_roles_autorizados(api_client, rol):
    """'admin' y 'bodeguero' pueden crear productos -> 201 + datos correctos."""
    iniciar_sesion(api_client, f"usuario_{rol}", "1234", grupos=(rol,))
    categoria = baker.make("api.Category")

    datos = {
        "name": "Mouse Óptico",
        "sku": "MOU-001",
        "category_id": str(categoria.id),
        "price": 4990,
        "stock": 25,
    }
    respuesta = api_client.post(CREATE_URL, datos, format="multipart")
    assert respuesta.status_code in (200, 201), (respuesta.status_code, respuesta.content)

    data = respuesta.json()
    for campo in ("id", "name", "sku", "price", "stock"):
        assert campo in data

    assert data["name"] == "Mouse Óptico"
    assert data["sku"] == "MOU-001"
    assert int(data["price"]) == 4990
    assert int(data["stock"]) == 25


# ──────────────────────────────────────────────────────────────────────────────
# Validaciones de integridad y restricciones
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_sku_unico_en_creacion(api_client):
    """El SKU debe ser único -> segundo intento con el mismo SKU => 400."""
    iniciar_sesion(api_client, "bod1", "1234", grupos=("bodeguero",))
    categoria = baker.make("api.Category")

    baker.make("api.Product", sku="SKU-UNICO", price=1000, stock=5, category=categoria)

    datos = {
        "name": "Cargador",
        "sku": "SKU-UNICO",  # repetido
        "category_id": str(categoria.id),
        "price": 12990,
        "stock": 3,
    }
    respuesta = api_client.post(CREATE_URL, datos, format="multipart")
    assert respuesta.status_code == 400, respuesta.content


@pytest.mark.django_db
@pytest.mark.parametrize(
    "datos_invalidos",
    [
        {"price": -1},  # precio negativo
        {"stock": -5},  # stock negativo
        {"price": 0},   # precio cero no permitido
    ],
)
def test_crear_producto_con_valores_invalidos(api_client, datos_invalidos):
    """price/stock inválidos => 400, no se crea."""
    iniciar_sesion(api_client, "bod2", "1234", grupos=("bodeguero",))
    categoria = baker.make("api.Category")

    base = {
        "name": "Cactus",
        "sku": "SPE-001",
        "category_id": str(categoria.id),
        "price": 19990,
        "stock": 2,
    }
    base.update(datos_invalidos)

    respuesta = api_client.post(CREATE_URL, base, format="multipart")
    assert respuesta.status_code == 400, respuesta.content


@pytest.mark.django_db
def test_campos_obligatorios_faltantes(api_client):
    """Faltan campos obligatorios (sku y categoría) => 400."""
    iniciar_sesion(api_client, "bod3", "1234", grupos=("bodeguero",))

    datos = {
        "name": "Monstera",
        "price": 399990,
        "stock": 4,
        # sin sku ni category_id
    }
    respuesta = api_client.post(CREATE_URL, datos, format="multipart")
    assert respuesta.status_code == 400, respuesta.content


# ──────────────────────────────────────────────────────────────────────────────
# Subida de imagen (Pillow)
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_crear_producto_con_imagen(api_client):
    """
    Crear producto con imagen; usamos Pillow para generar una imagen válida.
    Si Pillow no está instalado, se marca como 'skipped'.
    """
    iniciar_sesion(api_client, "admin1", "1234", grupos=("admin",))
    categoria = baker.make("api.Category")

    try:
        from PIL import Image
        import io
        buffer = io.BytesIO()
        Image.new("RGB", (2, 2)).save(buffer, format="JPEG")
        buffer.seek(0)
        bytes_imagen = buffer.getvalue()
        tipo_contenido = "image/jpeg"
    except Exception:
        pytest.skip("Pillow no está disponible en el contenedor (añade 'Pillow>=10.0.0' a requirements.txt).")

    imagen_falsa = SimpleUploadedFile(
        name="foto.jpg",
        content=bytes_imagen,
        content_type=tipo_contenido,
    )

    datos = {
        "name": "Macetero",
        "sku": "MAC-001",
        "category_id": str(categoria.id),
        "price": 2990,
        "stock": 50,
        "image": imagen_falsa,
    }

    respuesta = api_client.post(CREATE_URL, datos, format="multipart")
    assert respuesta.status_code in (200, 201), (respuesta.status_code, respuesta.content)

    data = respuesta.json()
    if "image" in data and data["image"]:
        assert isinstance(data["image"], str)
