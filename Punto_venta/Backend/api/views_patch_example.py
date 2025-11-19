# --- api/views.py (detalle + cambio de estado) ---
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.views import APIView
from .models import Category, Product, Order
from .serializers import CategorySerializer, ProductSerializer, OrderCreateSerializer, OrderSerializer

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        u = request.user
        return Response({"id": u.id, "username": u.username, "email": u.email})

class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

class ProductListView(generics.ListAPIView):
    queryset = Product.objects.select_related("category").order_by("name")
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

class OrderCreateView(generics.CreateAPIView):
    serializer_class = OrderCreateSerializer
    permission_classes = [AllowAny]
    def create(self, request, *args, **kwargs):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        order = s.save()
        return Response(OrderSerializer(order).data, status=201)

class OrderListView(generics.ListAPIView):
    queryset = Order.objects.order_by("-created_at").prefetch_related("items__product")
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

class OrderDetailView(generics.RetrieveAPIView):
    queryset = Order.objects.prefetch_related("items__product")
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

ALLOWED_TRANSITIONS = {
    "pendiente": ["preparando", "cancelado"],
    "preparando": ["entregado", "cancelado"],
    "entregado": [],
    "cancelado": [],
}

class OrderStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    def patch(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Pedido no encontrado."}, status=404)

        new_status = request.data.get("status")
        if new_status not in ALLOWED_TRANSITIONS.get(order.status, []):
            return Response({"detail": f"Transición inválida desde '{order.status}' a '{new_status}'."}, status=400)

        order.status = new_status
        order.save(update_fields=["status"])
        return Response(OrderSerializer(order).data)
