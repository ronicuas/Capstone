# api/management/commands/init_roles.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from api.models import Product, Category, Order

def add_perms(group, model, codename_prefixes):
    ct = ContentType.objects.get_for_model(model)
    for p in Permission.objects.filter(content_type=ct, codename__in=[f"{c}_{model._meta.model_name}" for c in codename_prefixes]):
        group.permissions.add(p)

class Command(BaseCommand):
    help = "Crea grupos: admin, vendedor, bodeguero"

    def handle(self, *args, **kwargs):
        admin, _ = Group.objects.get_or_create(name="admin")
        vendedor, _ = Group.objects.get_or_create(name="vendedor")
        bodeguero, _ = Group.objects.get_or_create(name="bodeguero")

        # Limpia para idempotencia
        for g in (admin, vendedor, bodeguero):
            g.permissions.clear()

        # Admin -> todos los perms de los 3 modelos
        for model in (Product, Category, Order):
            add_perms(admin, model, ["add","change","delete","view"])

        # Vendedor -> ver productos/categorías, crear órdenes, ver órdenes
        add_perms(vendedor, Product,  ["view"])
        add_perms(vendedor, Category, ["view"])
        add_perms(vendedor, Order,    ["add","view"])

        # Bodeguero -> ver/editar productos y categorías (stock), ver órdenes
        add_perms(bodeguero, Product,  ["view","change"])
        add_perms(bodeguero, Category, ["view","change","add"])
        add_perms(bodeguero, Order,    ["view"])

        self.stdout.write(self.style.SUCCESS("Grupos y permisos creados/actualizados."))
