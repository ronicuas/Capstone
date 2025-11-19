# --- api/serializers.py (agregar 'status' en OrderSerializer) ---
from rest_framework import serializers
from .models import Category, Product, Order, OrderItem

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]

class ProductSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    class Meta:
        model = Product
        fields = ["id", "sku", "name", "category", "price", "stock", "image"]

class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.CharField()
    quantity = serializers.IntegerField(min_value=1)

class CustomerSerializer(serializers.Serializer):
    full_name = serializers.CharField()
    email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    phone = serializers.CharField()

class DeliverySerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=["retiro", "envio"])
    address = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    notes = serializers.CharField(required=False, allow_null=True, allow_blank=True)

class OrderCreateSerializer(serializers.Serializer):
    customer = CustomerSerializer()
    delivery = DeliverySerializer()
    payment_method = serializers.ChoiceField(choices=["efectivo","debito","credito","transferencia"])
    items = OrderItemInputSerializer(many=True)

    def validate(self, data):
        if data["delivery"]["mode"] == "envio" and not (data["delivery"].get("address") or "").strip():
            raise serializers.ValidationError({"delivery": ["Dirección requerida para envío."]})
        return data

    def create(self, validated):
        from django.db import transaction
        customer = validated["customer"]
        delivery = validated["delivery"]
        items = validated["items"]
        pm = validated["payment_method"]

        with transaction.atomic():
            order = Order.objects.create(
                full_name=customer["full_name"],
                email=customer.get("email"),
                phone=customer["phone"],
                delivery_mode=delivery["mode"],
                address=delivery.get("address"),
                notes=delivery.get("notes") or "",
                payment_method=pm,
            )
            total = 0
            for it in items:
                try:
                    product = Product.objects.select_for_update().get(pk=it["product_id"])
                except Product.DoesNotExist:
                    raise serializers.ValidationError({"items": [f"Producto '{it['product_id']}' no existe."]})
                qty = int(it["quantity"])
                if product.stock < qty:
                    raise serializers.ValidationError({"items": [f"Stock insuficiente para {product.name}. Disponible: {product.stock}."]})
                product.stock -= qty
                product.save(update_fields=["stock"])
                OrderItem.objects.create(order=order, product=product, quantity=qty, price=product.price)
                total += qty * product.price
            order.total = total
            order.save(update_fields=["total"])
        return order

class OrderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    class Meta:
        model = Order
        fields = ["id", "code", "created_at", "full_name", "phone", "delivery_mode", "address", "payment_method", "total", "status", "items"]

    def get_items(self, obj):
        return [{
            "product": i.product.name,
            "sku": i.product.sku,
            "quantity": i.quantity,
            "price": i.price,
            "line_total": i.quantity * i.price
        } for i in obj.items.all()]
