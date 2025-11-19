// src/pages/ShopSuccess.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/shop.css";
import Ticket from "../components/Ticket";

const TZ = "America/Santiago";
const todayKey = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());

function formatCLP(n) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Guarda las ventas del día para el modal de cierre.
 * Claves usadas (ej para 2025-10-20):
 *  - pos_orders_2025-10-20_efectivo
 *  - pos_orders_2025-10-20_tarjeta
 *  - pos_orders_2025-10-20_transferencia
 *  - pos_orders_2025-10-20_count  (cantidad de órdenes)
 */
function registerDailySale(method, amount) {
  const k = todayKey();
  const key = `pos_orders_${k}_${method}`;   // pos_orders_2025-10-20_efectivo / _tarjeta / _transferencia
  const keyCount = `pos_orders_${k}_count`;  // cantidad de órdenes del día

  const prev = Number(localStorage.getItem(key) || 0);
  localStorage.setItem(key, String(prev + Number(amount || 0)));

  const prevCount = Number(localStorage.getItem(keyCount) || 0);
  localStorage.setItem(keyCount, String(prevCount + 1));
}

export default function ShopSuccess() {
  const navigate = useNavigate();

  // Carrito y totales guardados por el POS
  const cart = useMemo(
    () => JSON.parse(sessionStorage.getItem("pos_cart") || "[]"),
    []
  );
  const totals = useMemo(
    () => JSON.parse(sessionStorage.getItem("pos_totals") || "{}"),
    []
  );
  const total = totals?.total ?? 0;

  // Si no hay carrito, vuelve al POS
  useEffect(() => {
    if (!cart.length) navigate("/shop", { replace: true });
  }, [cart, navigate]);

  // Métodos: efectivo | tarjeta | transferencia
  const [method, setMethod] = useState("efectivo");
  const [cash, setCash] = useState("");
  const cashNum = Number(cash || 0);
  const change = Math.max(0, cashNum - total);

  // Mostrar Ticket tras crear orden
  const [order, setOrder] = useState(null);

  async function submit() {
  try {
    // Mapeo SOLO para el backend (tu API acepta "debito" en vez de "tarjeta")
    const paymentForApi = method === "tarjeta" ? "debito" : method;

    const payload = {
      customer: { full_name: "Cliente Demo", email: "", phone: "99999999" },
      delivery: { mode: "retiro", address: "", notes: "" },
      payment_method: paymentForApi,
      items: cart.map((l) => ({
        product_id: l.id,   // nombres que espera tu API
        quantity: l.qty,
      })),
    };

    // 1) Crear orden en backend
    const resp = await api.post("/api/orders/", payload);
    let ord = resp.data;

    // 2) Si vino solo id, trae detalle
    if (!ord?.items) {
      const id = ord?.id ?? ord?.order_id ?? ord;
      const det = await api.get(`/api/orders/${id}/`);
      ord = det.data;
    }

    // 3) Registrar en arqueo local (efectivo | tarjeta | transferencia)
    registerDailySale(method, total);

    // 4) Limpiar POS y mostrar boleta
    sessionStorage.removeItem("pos_cart");
    sessionStorage.removeItem("pos_totals");
    setOrder(ord); // ← esto dispara la vista del Ticket
  } catch (err) {
    console.error("Error al registrar la venta:", err?.response?.data || err);
    alert(
      "No se pudo registrar la venta.\n\n" +
      JSON.stringify(err?.response?.data || err?.message || err)
    );
  }
}


  // ===== Vista 2: Boleta (Ticket) =====
  if (order) {
    return (
      <div className="ticket-page">
        <div className="ticket-wrap">
          <Ticket order={order} autoPrint />
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button className="btn primary" onClick={() => navigate("/shop")}>
              Nueva venta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Vista 1: Cobro =====
  return (
    <div className="pay-screen">
      <div className="pay-card">
        <h2>Total a pagar</h2>
        <div className="total-big">{formatCLP(total)}</div>

        <div className="pay-methods">
          <button
            className={`pm ${method === "efectivo" ? "active" : ""}`}
            onClick={() => setMethod("efectivo")}
          >
            💵 Efectivo
          </button>
          <button
            className={`pm ${method === "tarjeta" ? "active" : ""}`}
            onClick={() => setMethod("tarjeta")}
          >
            💳 Tarjeta
          </button>
          <button
            className={`pm ${method === "transferencia" ? "active" : ""}`}
            onClick={() => setMethod("transferencia")}
          >
            🏦 Transferencia
          </button>
        </div>

        {method === "efectivo" && (
          <div className="cash-box">
            <label>Monto recibido</label>
            <input
              type="number"
              min="0"
              step="100"
              placeholder="0"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
            />
            <div className="change">
              <span>Vuelto</span>
              <strong>{formatCLP(change)}</strong>
            </div>
          </div>
        )}

        <div className="pay-actions">
          <button className="btn ghost" onClick={() => navigate("/shop")}>
            Regresar
          </button>
          <button
            className="btn primary"
            onClick={submit}
            disabled={method === "efectivo" && Number(cash || 0) < total}
            title={
              method === "efectivo" && Number(cash || 0) < total
                ? "Monto insuficiente para pagar"
                : ""
            }
          >
            Validar pago
          </button>
        </div>
      </div>
    </div>
  );
}
