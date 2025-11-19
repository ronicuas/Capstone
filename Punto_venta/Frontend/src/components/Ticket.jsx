// src/components/Ticket.jsx
import React, { useEffect } from "react";
import "../styles/ticket.css";

export default function Ticket({ order = {}, autoPrint = false }) {
  // === Utils ===
  const CLP = (n) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Number(n || 0));

  const fmtDateTime = (d) =>
    new Intl.DateTimeFormat("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);

  // Si el backend no trae created_at, usamos ahora
  const createdAt =
    order.created_at ? new Date(order.created_at) : new Date();

  // Map de método de pago a etiqueta amigable
  const payLabel = {
    efectivo: "Efectivo",
    debito: "Tarjeta",
    credito: "Tarjeta",
    tarjeta: "Tarjeta",
    transferencia: "Transferencia",
  };
  const paymentRaw = (order.payment_method || "").toLowerCase();
  const paymentText = payLabel[paymentRaw] || (order.payment_method || "").toUpperCase();

  // Datos del negocio (tu info fija)
  const biz = {
    logoText: "PLANTITAS",
    razon: "PLANTITAS DONDE LA FRAN",
    giro: "VENTA DE PLANTAS Y ACCESORIOS",
    rut: "76.123.456-7",
    direccion: "Av. Siempreviva 742",
    comuna: "Santiago",
    ciudad: "Santiago",
    telefono: "+56 9 1234 5678",
    sucursal: "Casa Matriz",
  };

  // Totales (con fallback a 19% IVA si no viene neto/iva desglosado)
  const total = Number(order.total || 0);
  const neto = order.neto != null ? Number(order.neto) : Math.round(total / 1.19);
  const iva = order.iva != null ? Number(order.iva) : total - neto;

  // Cliente (acepta order.customer_name o order.customer.full_name)
  const customerName =
    order.customer_name ||
    order.customer?.full_name ||
    order.customer?.name ||
    "";

  // Numeración de documento
  const number = order.number || order.code || order.id || "-";

  // Línea: cálculo de unitario robusto
  const unitFrom = (it) => {
    const qty = Number(it.quantity || 1);
    if (it.unit_price != null) return Number(it.unit_price);
    if (it.price != null) return Number(it.price);
    if (it.line_total != null && qty > 0) return Number(it.line_total) / qty;
    return 0;
  };
  const baseFrom = (it, unit) => {
    if (it.price_base != null) return Number(it.price_base);
    return unit;
  };

  useEffect(() => {
    if (autoPrint) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [autoPrint]);

  return (
    <div className="ticket">
      {/* Encabezado */}
      <div className="t-header">
        <div className="t-logo">{biz.logoText}</div>
        <div className="t-title">BOLETA ELECTRÓNICA</div>
        <div className="t-rut">RUT: {biz.rut}</div>
        <div className="t-razon">{biz.razon}</div>
        <div className="t-giro">Giro: {biz.giro}</div>
        <div className="t-dir">Dirección: {biz.direccion}</div>
        <div className="t-com">
          {biz.comuna} — {biz.ciudad}
        </div>
        <div className="t-fono">Fono: {biz.telefono}</div>
        <div className="t-suc">Sucursal: {biz.sucursal}</div>
      </div>

      {/* Info de orden */}
      <div className="t-meta">
        <div>
          N°: <b>{number}</b>
        </div>
        <div>Fecha: {fmtDateTime(createdAt)}</div>
        {customerName && <div>Cliente: {customerName}</div>}
        {paymentText && <div>Pago: {paymentText}</div>}
      </div>

      {/* Tabla productos */}
      <div className="t-table">
        <div className="t-row t-head">
          <div className="c-cant">CANT.</div>
          <div className="c-desc">ITEM</div>
          <div className="c-val">VALOR U.</div>
          <div className="c-sub">SUBTOTAL</div>
        </div>

        {(order.items || []).map((it, i) => {
          const qty = Number(it.quantity || 0);
          const unit = unitFrom(it);
          const base = baseFrom(it, unit);
          const line = Number(it.line_total != null ? it.line_total : unit * qty);
          const name = it.product || it.name || it.title || "Producto";
          const sku = it.sku ? ` (${it.sku})` : "";
          const hasDiscount = Number(it.discount_pct || 0) > 0 && base > unit;
          return (
            <div key={i} className="t-row">
              <div className="c-cant">{qty}</div>
              <div className="c-desc">
                {name}
                {sku}
              </div>
              <div className="c-val">
                {hasDiscount ? (
                  <>
                    <span className="t-price-old">{CLP(base)}</span>
                    <span className="t-price-new">{CLP(unit)}</span>
                    <span className="t-price-badge">-{it.discount_pct}%</span>
                  </>
                ) : (
                  CLP(unit)
                )}
              </div>
              <div className="c-sub">{CLP(line)}</div>
            </div>
          );
        })}
      </div>

      {/* Totales */}
      <div className="t-totals">
        <div>
          <span>NETO:</span>
          <b>{CLP(neto)}</b>
        </div>
        <div>
          <span>IVA (19%):</span>
          <b>{CLP(iva)}</b>
        </div>
        <div className="t-total">
          <span>TOTAL:</span>
          <b>{CLP(total)}</b>
        </div>
      </div>

      {/* Pie */}
      <div className="t-footer">
        <div>Gracias por su compra 🌿</div>
        <div>Boleta generada por Plantitas POS</div>
      </div>
    </div>
  );
}
