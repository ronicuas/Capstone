# Backend/api/urls.py
from django.urls import path
from .views import (
    MeView,
    CategoryListCreateView, CategoryDetailView,
    ProductListCreateView, ProductDetailView, ProductWaterView, ProductExtendLifeView,
    OrderCreateView, OrderListView, OrderDetailView,
    KPIOverview, KPITopProductos, KPIMesMayorVenta, VentasPorMes,
    VentasPorCategoria, MediosDePago, PromedioVentaDiaria,
    ExportExcelView, ExportPDFView, ReportQueryView,
    AlertListView, PlantCareListView,
)

urlpatterns = [
    path("me/", MeView.as_view()),
    # Categorías (IDs enteros)
    path("categories/", CategoryListCreateView.as_view()),
    path("categories/<int:pk>/", CategoryDetailView.as_view()),

    # Productos (IDs alfanuméricos -> usar <str:pk>)
    path("products/", ProductListCreateView.as_view()),
    path("products/<str:pk>/", ProductDetailView.as_view()),   # <= aquí el cambio
    path("products/<str:pk>/regar/", ProductWaterView.as_view()),
    path("products/<str:pk>/extender-vida/", ProductExtendLifeView.as_view()),

    # Órdenes (IDs enteros)
    path("orders/", OrderCreateView.as_view()),
    path("orders/list/", OrderListView.as_view()),
    path("orders/<int:pk>/", OrderDetailView.as_view()),

    # KPIs/Informes 
    path("kpi/overview/", KPIOverview.as_view()),
    path("kpi/top-productos/", KPITopProductos.as_view()),
    path("kpi/mes-mayor-venta/", KPIMesMayorVenta.as_view()),
    path("kpi/ventas-por-mes/", VentasPorMes.as_view()),
    path("kpi/ventas-por-categoria/", VentasPorCategoria.as_view()),
    path("kpi/medios-pago/", MediosDePago.as_view()),
    path("kpi/promedio-diario/", PromedioVentaDiaria.as_view()),
    path("kpi/export-excel/", ExportExcelView.as_view()),
    path("kpi/export-pdf/",   ExportPDFView.as_view()),
    path("reportes/query/", ReportQueryView.as_view(), name="report-query"),

    path("alerts/", AlertListView.as_view()),
    path("cuidados/", PlantCareListView.as_view()),
]
