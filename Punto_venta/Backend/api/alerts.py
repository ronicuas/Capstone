"""Utilidades para generar y enviar alertas de cuidado."""
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import Alert, Product

DEFAULT_RIEGO_DIAS = 3
DEFAULT_VIDA_UTIL_DIAS = 30
DEFAULT_SOBRESTOCK_DIAS = 20


def _resolver_alertas(producto: Product, tipo: str):
    """Marca como resueltas todas las alertas no resueltas de cierto tipo."""
    pending = producto.alertas.filter(tipo=tipo, resuelta=False)
    if pending.exists():
        pending.update(resuelta=True, fecha_resolucion=timezone.now())


def _crear_alerta(producto: Product, tipo: str, mensaje: str, nivel: str = "ADVERTENCIA"):
    """Crea la alerta solo si no existe otra sin resolver del mismo tipo."""
    if producto.alertas.filter(tipo=tipo, resuelta=False).exists():
        return None
    return Alert.objects.create(producto=producto, tipo=tipo, mensaje=mensaje, nivel=nivel)


def evaluar_alertas_producto(producto: Product):
    """
    Evalúa un producto y genera/actualiza alertas en base a los umbrales definidos.
    Retorna las alertas creadas.
    """
    created = []
    now = timezone.now()
    fecha_ingreso = producto.fecha_ingreso or now

    # --- Riego ---
    frecuencia = producto.frecuencia_riego_dias or DEFAULT_RIEGO_DIAS
    referencia_riego = producto.ultima_fecha_riego or fecha_ingreso
    dias_sin_riego = (now - referencia_riego).days if referencia_riego else 0
    if referencia_riego and dias_sin_riego > frecuencia:
        alerta = _crear_alerta(
            producto,
            "RIEGO",
            f"La planta '{producto.name}' lleva {dias_sin_riego} días sin riego (frecuencia recomendada: cada {frecuencia} días).",
            nivel="ADVERTENCIA",
        )
        if alerta:
            created.append(alerta)
    else:
        _resolver_alertas(producto, "RIEGO")

    # --- Vida útil ---
    vida_util = producto.vida_util_dias or DEFAULT_VIDA_UTIL_DIAS
    if (now - fecha_ingreso).days > vida_util:
        alerta = _crear_alerta(
            producto,
            "VIDA_UTIL",
            f"La vida útil estimada ({vida_util} días) para '{producto.name}' fue excedida.",
            nivel="CRITICO",
        )
        if alerta:
            created.append(alerta)
    else:
        _resolver_alertas(producto, "VIDA_UTIL")

    # --- Sobrestock / sin rotación ---
    if (now - fecha_ingreso).days > DEFAULT_SOBRESTOCK_DIAS:
        alerta = _crear_alerta(
            producto,
            "SOBRESTOCK",
            f"'{producto.name}' lleva más de {DEFAULT_SOBRESTOCK_DIAS} días en vitrina. Considera una oferta.",
            nivel="ADVERTENCIA",
        )
        if alerta:
            created.append(alerta)
    else:
        _resolver_alertas(producto, "SOBRESTOCK")

    # --- Riesgo climático ---
    if producto.sensibilidad_climatica == "ALTA":
        riesgo = False
        if producto.ultima_fecha_riego:
            riesgo |= (now - (producto.ultima_fecha_riego)).days > (producto.frecuencia_riego_dias or DEFAULT_RIEGO_DIAS)
        if (now - fecha_ingreso).days > vida_util:
            riesgo = True
        if riesgo:
            alerta = _crear_alerta(
                producto,
                "RIESGO_ALTO",
                f"'{producto.name}' es muy sensible al clima y presenta condiciones de riesgo.",
                nivel="CRITICO",
            )
            if alerta:
                created.append(alerta)
        else:
            _resolver_alertas(producto, "RIESGO_ALTO")
    else:
        _resolver_alertas(producto, "RIESGO_ALTO")

    return created


def enviar_alertas_pendientes_por_correo():
    """
    Envía por correo las alertas no resueltas generadas en el día.
    Puede ser invocada desde un management command programado.
    """
    hoy = timezone.localdate()
    pendientes = Alert.objects.select_related("producto").filter(
        resuelta=False,
        fecha_creacion__date=hoy,
    ).order_by("fecha_creacion")

    if not pendientes.exists():
        return 0

    lines = [
        f"- [{alerta.get_tipo_display()} | {alerta.get_nivel_display()}] "
        f"{alerta.producto.name}: {alerta.mensaje}"
        for alerta in pendientes
    ]
    html_rows = "\n".join(
        f"<tr>"
        f"<td style='padding:6px 10px;border:1px solid #e5e7eb;'>{alerta.get_tipo_display()}</td>"
        f"<td style='padding:6px 10px;border:1px solid #e5e7eb;'>{alerta.get_nivel_display()}</td>"
        f"<td style='padding:6px 10px;border:1px solid #e5e7eb; font-weight:600;'>{alerta.producto.name}</td>"
        f"<td style='padding:6px 10px;border:1px solid #e5e7eb;'>{alerta.mensaje}</td>"
        f"</tr>"
        for alerta in pendientes
    )

    raw_dest = getattr(settings, "ALERTAS_EMAIL_TO", None)
    if not raw_dest:
        raw_dest = [getattr(settings, "DEFAULT_FROM_EMAIL", "admin@example.com")]
    elif isinstance(raw_dest, str):
        raw_dest = [
            chunk.strip()
            for chunk in raw_dest.replace(";", ",").split(",")
            if chunk.strip()
        ]
    remitente = getattr(settings, "DEFAULT_FROM_EMAIL", raw_dest[0] if raw_dest else None)

    date_str = hoy.strftime("%d/%m/%Y")
    count = len(lines)
    text_body = "\n".join(
        [
            "Hola,",
            "",
            f"Se detectaron {count} alerta(s) pendiente(s) hoy ({date_str}).",
            "Detalle:",
            "",
            *lines,
        ]
    )
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #111827;">
        <h2 style="color:#047857;margin-bottom:8px;">Alertas de cuidado de plantas</h2>
        <p>Se detectaron <strong>{count}</strong> alerta(s) pendiente(s) hoy ({date_str}).</p>
        <table style="border-collapse:collapse;width:100%;max-width:640px;margin-top:12px;font-size:14px;">
          <thead>
            <tr style="background-color:#d1fae5;">
              <th style="text-align:left;padding:8px 10px;border:1px solid #e5e7eb;">Tipo</th>
              <th style="text-align:left;padding:8px 10px;border:1px solid #e5e7eb;">Nivel</th>
              <th style="text-align:left;padding:8px 10px;border:1px solid #e5e7eb;">Producto</th>
              <th style="text-align:left;padding:8px 10px;border:1px solid #e5e7eb;">Mensaje</th>
            </tr>
          </thead>
          <tbody>
            {html_rows}
          </tbody>
        </table>
        <p style="margin-top:18px;font-size:12px;color:#6b7280;">Este correo se genera automáticamente cuando existan alertas pendientes.</p>
      </body>
    </html>
    """

    for dest in raw_dest:
        send_mail(
            subject=f"Alertas de cuidado de plantas - {date_str}",
            message=text_body,
            from_email=remitente or dest,
            recipient_list=[dest],
            fail_silently=False,
            html_message=html_body,
        )
    return pendientes.count()
