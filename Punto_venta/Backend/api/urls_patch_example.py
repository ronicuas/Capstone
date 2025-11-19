# --- api/urls.py (agregar rutas detalle/estado) ---
from django.urls import path
from .views import (
    MeView, CategoryListView, ProductListView,
    OrderCreateView, OrderListView, OrderDetailView, OrderStatusUpdateView
)

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("categories/", CategoryListView.as_view(), name="categories"),
    path("products/", ProductListView.as_view(), name="products"),
    path("orders/", OrderCreateView.as_view(), name="orders"),
    path("orders/list/", OrderListView.as_view(), name="orders-list"),
    path("orders/<int:pk>/", OrderDetailView.as_view(), name="orders-detail"),
    path("orders/<int:pk>/status/", OrderStatusUpdateView.as_view(), name="orders-status"),
]
