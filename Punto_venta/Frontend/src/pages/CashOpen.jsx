// src/pages/CashOpen.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/pos-odoo.css";

const TZ = "America/Santiago";
const todayKey = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());

export default function CashOpen() {
  const nav = useNavigate();
  const [opening, setOpening] = useState("");
  const [note, setNote] = useState("");

  function submit() {
    const k = todayKey();

    localStorage.setItem(
      "pos_cash_open",
        JSON.stringify({
        date: todayKey(),
        opening_cash: Number(opening || 0),
        note: note || "",
  })
);

    // Guarda la apertura del día (efectivo)
    localStorage.setItem(`pos_opening_cash_${k}`, String(Number(opening || 0)));
    localStorage.setItem(`pos_open_note_${k}`, note || "");

    // (Re)inicia acumuladores de ventas del día para que el cierre los lea
    const base = `pos_orders_${k}_`;
    localStorage.setItem(base + "efectivo", "0");
    localStorage.setItem(base + "tarjeta", "0");
    localStorage.setItem(base + "transferencia", "0");
    localStorage.setItem(base + "count", "0");

    // Si manejas movimientos manuales de caja:
    // localStorage.setItem(`pos_movs_${k}`, "0");

    nav("/shop"); // vuelve al POS
  }

  return (
    <div className="pay-screen" style={{ background: "#F5F7F2" }}>
      <div className="pay-card" style={{ width: "min(680px, 96vw)" }}>
        <h2>Abrir caja registradora</h2>

        <div className="cs2-field" style={{ marginTop: 10 }}>
          <label>Fondo inicial (efectivo)</label>
          <input
            className="cs2-input"
            type="number"
            min="0"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
            placeholder="Ej: 100000"
          />
        </div>

        <div className="cs2-field">
          <label>Nota de apertura (opcional)</label>
          <textarea
            className="cs2-input"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Observaciones…"
          />
        </div>

        <div className="pay-actions">
          <button className="btn ghost" onClick={() => nav("/")}>Cancelar</button>
          <button className="btn primary" onClick={submit}>Abrir caja</button>
        </div>
      </div>
    </div>
  );
}
