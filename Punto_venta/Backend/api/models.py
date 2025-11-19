from django.conf import settings
from django.db import models
from django.utils import timezone
import os, uuid
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Q, CheckConstraint

class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)

    def __str__(self):
        return self.name

def product_image_path(instance, filename):
    ext = filename.split(".")[-1]
    new_name = f"{uuid.uuid4().hex}.{ext}"
    return os.path.join("products", new_name)

class Product(models.Model):
    SENSIBILIDAD_CHOICES = [
        ("BAJA", "Baja"),
        ("MEDIA", "Media"),
        ("ALTA", "Alta"),
    ]

    id = models.CharField(primary_key=True, max_length=20)  # e.g. "P001"
    sku = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=120)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    price = models.PositiveIntegerField(help_text="Precio en CLP, sin decimales",validators=[MinValueValidator(1)])
    stock = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to=product_image_path, blank=True, null=True)
    frecuencia_riego_dias = models.PositiveIntegerField(null=True, blank=True)
    vida_util_dias = models.PositiveIntegerField(null=True, blank=True)
    sensibilidad_climatica = models.CharField(max_length=10, choices=SENSIBILIDAD_CHOICES, null=True, blank=True)
    fecha_ingreso = models.DateTimeField(default=timezone.now)
    ultima_fecha_riego = models.DateTimeField(null=True, blank=True)
    discount_pct = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(90)],
        help_text="Porcentaje de descuento aplicado al precio (0-90)."
    )

    def __str__(self):
        return f"{self.name} ({self.sku})"

    def price_with_discount(self):
        pct = max(0, min(90, self.discount_pct or 0))
        if pct <= 0:
            return int(self.price)
        return max(0, int(round(self.price * (100 - pct) / 100)))
    
    class Meta:
        constraints = [
            CheckConstraint(check=Q(price__gt=0), name="product_price_gt_0"),
        ]
    

    class Meta:
        indexes = [
            models.Index(fields=["category"], name="idx_products_category"),
        ]

class Order(models.Model):
    PAYMENT_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('debito', 'Débito'),
        ('credito', 'Crédito'),
        ('transferencia', 'Transferencia'),
    ]

    STATUS_CHOICES = [
        ('paid', 'Pagada'),          # finalizada
        ('cancelled', 'Cancelada'),
    ]

    code = models.CharField(max_length=40, unique=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES)
    total = models.PositiveIntegerField(default=0)

    #  estado final de la orden
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='paid')

    def save(self, *args, **kwargs):
        creating = self._state.adding
        super().save(*args, **kwargs)
        if creating and not self.code:
            today = timezone.localdate()
            prefix = f"PDLF-{today.strftime('%Y%m%d')}"
            seq = str(self.id).zfill(4)
            self.code = f"{prefix}-{seq}"
            super().save(update_fields=['code'])

    def __str__(self):
        return self.code or f"Order {self.pk}"
    class Meta:
        indexes = [
            models.Index(fields=["created_at"], name="idx_orders_created_at"),
            models.Index(fields=["status"], name="idx_orders_status"),
            models.Index(fields=["payment_method"], name="idx_orders_pay_method"),
        ]
    
class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')

    # Permite borrar productos sin romper historial
    product = models.ForeignKey('Product', on_delete=models.SET_NULL, null=True, blank=True)

    # snapshots para conservar info aunque borres el producto
    product_name = models.CharField(max_length=120, blank=True)
    product_sku  = models.CharField(max_length=40, blank=True)

    quantity = models.PositiveIntegerField()
    price = models.PositiveIntegerField(help_text="Precio unitario al momento de la compra (ya con descuento)")
    price_base = models.PositiveIntegerField(default=0, help_text="Precio unitario antes del descuento")
    discount_pct = models.PositiveIntegerField(default=0)

    def line_total(self):
        return self.quantity * self.price
    
    class Meta:
        indexes = [
            models.Index(fields=["order"], name="idx_oitems_order"),
            models.Index(fields=["product"], name="idx_oitems_product"),
        ]


class Alert(models.Model):
    TIPO_CHOICES = [
        ("RIEGO", "Riego atrasado"),
        ("VIDA_UTIL", "Vida útil excedida"),
        ("SOBRESTOCK", "Sobrestock / sin rotación"),
        ("RIESGO_ALTO", "Riesgo climático alto"),
    ]
    NIVEL_CHOICES = [
        ("INFO", "Información"),
        ("ADVERTENCIA", "Advertencia"),
        ("CRITICO", "Crítico"),
    ]

    producto = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="alertas")
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    mensaje = models.TextField()
    nivel = models.CharField(max_length=15, choices=NIVEL_CHOICES, default="ADVERTENCIA")
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    resuelta = models.BooleanField(default=False)
    fecha_resolucion = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["tipo", "resuelta"], name="idx_alert_tipo_resuelta"),
            models.Index(fields=["fecha_creacion"], name="idx_alert_fecha"),
        ]

    def __str__(self):
        return f"{self.producto} - {self.tipo}"


class PlantCare(models.Model):
    ACCION_CHOICES = [
        ("RIEGO", "Riego"),
        ("PODA", "Poda"),
        ("CAMBIO_MACETA", "Cambio de maceta"),
        ("EXTENDER_VIDA", "Extensión de vida útil"),
    ]

    producto = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="cuidados")
    tipo_accion = models.CharField(max_length=20, choices=ACCION_CHOICES)
    fecha_accion = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    observaciones = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["-fecha_accion"]

    def __str__(self):
        return f"{self.producto} - {self.tipo_accion} ({self.fecha_accion:%Y-%m-%d})"
