# --- api/models.py (añadir campo 'status' a Order) ---
from django.db import models
from django.utils import timezone

class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    def __str__(self): return self.name

class Product(models.Model):
    id = models.CharField(primary_key=True, max_length=20)
    sku = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=120)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    price = models.PositiveIntegerField()
    stock = models.PositiveIntegerField(default=0)
    image = models.URLField(blank=True, null=True)
    def __str__(self): return f"{self.name} ({self.sku})"

class Order(models.Model):
    STATUS_CHOICES = [
        ("pendiente", "Pendiente"),
        ("preparando", "Preparando"),
        ("entregado", "Entregado"),
        ("cancelado", "Cancelado"),
    ]

    code = models.CharField(max_length=40, unique=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    full_name = models.CharField(max_length=120)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=30)
    delivery_mode = models.CharField(max_length=20, choices=[('retiro', 'Retiro en tienda'), ('envio', 'Envío a domicilio')])
    address = models.CharField(max_length=200, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    payment_method = models.CharField(max_length=20, choices=[('efectivo','Efectivo'),('debito','Débito'),('credito','Crédito'),('transferencia','Transferencia')])
    total = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pendiente")  # <--- NUEVO

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

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    price = models.PositiveIntegerField()
    def line_total(self): return self.quantity * self.price
