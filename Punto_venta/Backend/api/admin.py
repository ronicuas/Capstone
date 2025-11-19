from django.contrib import admin
from .models import Category, Product, Order, OrderItem

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "sku", "name", "category", "price", "stock")
    list_filter = ("category",)
    search_fields = ("sku", "name")

class OrderItemInline(admin.TabularInline):
    model = Order.items.rel.related_model
    extra = 0
    readonly_fields = ("product", "quantity", "price")

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("code", "created_at", "payment_method", "total")
    inlines = [OrderItemInline]
