from django.core.management.base import BaseCommand

from api.alerts import enviar_alertas_pendientes_por_correo


class Command(BaseCommand):
    help = "Envía por correo el resumen de alertas pendientes del día."

    def handle(self, *args, **options):
        count = enviar_alertas_pendientes_por_correo()
        if count:
            self.stdout.write(self.style.SUCCESS(f"Se enviaron {count} alerta(s) por correo."))
        else:
            self.stdout.write("No hay alertas pendientes para enviar hoy.")
