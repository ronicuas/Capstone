# Backend/seed_shop.py
from api.models import Category, Product

cat_names = ["Ramos", "Plantas", "Flores sueltas", "Accesorios"]
cats = {name: Category.objects.get_or_create(name=name)[0] for name in cat_names}

items = [
  {"id":"P001","sku":"RAMO-PRIM","name":"Ramo Primavera","price":13990,"stock":7,"category":"Ramos"},
  {"id":"P002","sku":"RAMO-DELX","name":"Ramo Deluxe","price":24990,"stock":3,"category":"Ramos"},
  {"id":"P003","sku":"PL-CACT-01","name":"Cactus mini","price":5990,"stock":25,"category":"Plantas"},
  {"id":"P004","sku":"PL-SUC-02","name":"Suculenta Jade","price":6990,"stock":18,"category":"Plantas"},
  {"id":"P005","sku":"FL-ROSA-UNI","name":"Rosa roja (unidad)","price":1490,"stock":12,"category":"Flores sueltas"},
  {"id":"P006","sku":"FL-LIR-UNI","name":"Lirio blanco (unidad)","price":1490,"stock":6,"category":"Flores sueltas"},
  {"id":"P007","sku":"ACC-JARR","name":"Jarrón vidrio","price":7990,"stock":9,"category":"Accesorios"},
  {"id":"P008","sku":"ACC-TARJ","name":"Tarjeta dedicatoria","price":990,"stock":100,"category":"Accesorios"},
]

for it in items:
    Product.objects.update_or_create(
        id=it["id"],
        defaults=dict(
            sku=it["sku"], name=it["name"], price=it["price"],
            stock=it["stock"], category=cats[it["category"]]
        ),
    )

print("Seed OK: categorías y productos creados/actualizados.")
