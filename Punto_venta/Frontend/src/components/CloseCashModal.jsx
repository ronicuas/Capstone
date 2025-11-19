// src/components/CloseCashModal.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const TZ = "America/Santiago";
const todayKey = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());

const CLP = (n) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(isFinite(n) ? n : 0));

const num = (v) => {
  const n = Number(v);
  return isFinite(n) ? n : 0;
};

export default function CloseCashModal({ open, onClose, onClosed }) {
  const k = todayKey();
  const navigate = useNavigate();

  // --- Lecturas seguras de localStorage ---
  const data = useMemo(() => {
    // Ventas del día por método
    const baseSales = `pos_orders_${k}_`;
    const efectivo = num(localStorage.getItem(baseSales + "efectivo"));
    const tarjeta = num(localStorage.getItem(baseSales + "tarjeta"));
    const transferencia = num(localStorage.getItem(baseSales + "transferencia"));
    const ordersCount = num(localStorage.getItem(baseSales + "count"));

    // Apertura guardada por CashOpen (pos_cash_open)
    let openingCash = 0;
    try {
      const raw = localStorage.getItem("pos_cash_open");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.date === k) openingCash = num(parsed.opening_cash);
      }
    } catch (_) {}

    // Movimientos de caja (si en algún momento los guardas)
    const cashMovs = num(localStorage.getItem(`pos_movs_${k}`));

    return { efectivo, tarjeta, transferencia, ordersCount, openingCash, cashMovs };
  }, [open]); // recalcula al abrir

  const [cashCount, setCashCount] = useState("");
  const [openNote, setOpenNote] = useState("");
  const [closeNote, setCloseNote] = useState("");

  if (!open) return null;

  const efectivoContado = data.openingCash + data.cashMovs + data.efectivo;
  const diffCash = num(cashCount) - efectivoContado;

  function doClose() {
    // Limpia ventas del día
    const baseSales = `pos_orders_${k}_`;
    ["efectivo", "tarjeta", "transferencia", "count"].forEach((b) =>
      localStorage.removeItem(baseSales + b)
    );
    // (Opcional) registra nota de cierre
    if (closeNote?.trim()) {
      localStorage.setItem(`pos_close_note_${k}`, closeNote.trim());
    }

    const when = new Date().toLocaleString("es-CL", { timeZone: TZ });
    alert(`CAJA CERRADA\nFecha: ${when}`);

    onClose?.();
    if (onClosed) onClosed();
  }

  // ——— Estilos mínimos inline por si el CSS no carga ———
  const S = {
    back: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    modal: {
      width: "min(920px, 96vw)",
      maxHeight: "90vh",
      overflow: "auto",
      borderRadius: 12,
      background: "#fff",
      border: "1px solid #E0E5DA",
      boxShadow: "0 20px 60px rgba(0,0,0,.25)",
    },
    wrap: { display: "flex", flexDirection: "column", gap: 12, padding: 14 },
    head: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "6px 2px 10px",
      borderBottom: "1px solid #E0E5DA",
    },
    title: { fontWeight: 800, fontSize: 16, color: "#212121" },
    badge: {
      background: "#F6F8F3",
      border: "1px solid #E0E5DA",
      borderRadius: 8,
      padding: "6px 10px",
      fontWeight: 700,
      color: "#2E7D32",
    },
    section: {
      border: "1px solid #E0E5DA",
      borderRadius: 12,
      background: "#FFFFFF",
    },
    secHead: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 12px",
      borderBottom: "1px solid #E0E5DA",
    },
    secTitle: { fontWeight: 800, color: "#212121" },
    amount: { fontWeight: 900, color: "#212121" },
    lines: { padding: "6px 12px" },
    line: { display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#555" },
    lineOk: { color: "#2E7D32" },
    lineNeg: { color: "#E53935" },
    field: { display: "grid", gap: 6, padding: "10px 12px" },
    input: {
      height: 40,
      border: "1px solid #E0E5DA",
      borderRadius: 10,
      background: "#fff",
      color: "#212121",
      padding: "0 10px",
    },
    textarea: {
      border: "1px solid #E0E5DA",
      borderRadius: 10,
      background: "#fff",
      color: "#212121",
      padding: 10,
      minHeight: 80,
      resize: "vertical",
    },
    footer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      padding: "8px 0 0 0",
      borderTop: "1px solid #E0E5DA",
    },
    btn: {
      base: {
        border: "1px solid #E0E5DA",
        borderRadius: 10,
        padding: "10px 14px",
        fontWeight: 800,
        cursor: "pointer",
        background: "#fff",
      },
      primary: {
        background: "#2E7D32",
        color: "#fff",
        border: "1px solid #2E7D32",
      },
    },
  };

  return (
    <div style={S.back} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.wrap}>
          <div style={S.head}>
            <div style={S.title}>Cerrando la caja registradora</div>
            <div style={S.badge}>
              {data.ordersCount} órdenes • {CLP(data.efectivo + data.tarjeta + data.transferencia)}
            </div>
          </div>

          {/* EFECTIVO */}
          <section style={S.section}>
            <div style={S.secHead}>
              <div style={S.secTitle}>Efectivo</div>
              <div style={S.amount}>{CLP(efectivoContado)}</div>
            </div>
            <div style={S.lines}>
              <div style={S.line}><span>Apertura</span><span>{CLP(data.openingCash)}</span></div>
              <div style={S.line}><span>Pagos</span><span>{CLP(data.efectivo)}</span></div>
              <div style={S.line}><span>Entradas/Salidas</span><span>{CLP(data.cashMovs)}</span></div>
              <div style={S.line}><span>Contado</span><span>{CLP(efectivoContado)}</span></div>
              <div style={{ ...S.line, ...(diffCash === 0 ? S.lineOk : diffCash < 0 ? S.lineNeg : {}) }}>
                <span>Diferencia</span><span>{CLP(diffCash)}</span>
              </div>
              <div style={S.field}>
                <label>Conteo de efectivo</label>
                <input
                  style={S.input}
                  placeholder="Ej: 4490"
                  value={cashCount}
                  onChange={(e) => setCashCount(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* TARJETA */}
          <section style={S.section}>
            <div style={S.secHead}>
              <div style={S.secTitle}>Tarjeta</div>
              <div style={S.amount}>{CLP(data.tarjeta)}</div>
            </div>
            <div style={S.lines}>
              <div style={S.line}><span>Pagos</span><span>{CLP(data.tarjeta)}</span></div>
              <div style={{ ...S.line, ...S.lineOk }}>
                <span>Diferencia</span><span>{CLP(0)}</span>
              </div>
            </div>
          </section>

          {/* TRANSFERENCIA */}
          <section style={S.section}>
            <div style={S.secHead}>
              <div style={S.secTitle}>Transferencia</div>
              <div style={S.amount}>{CLP(data.transferencia)}</div>
            </div>
            <div style={S.lines}>
              <div style={S.line}><span>Pagos</span><span>{CLP(data.transferencia)}</span></div>
              <div style={{ ...S.line, ...S.lineOk }}>
                <span>Diferencia</span><span>{CLP(0)}</span>
              </div>
            </div>
          </section>

          <div style={S.footer}>
            <div />
            <div style={{ display: "flex", gap: 10 }}>
              <button style={S.btn.base} onClick={onClose}>Descartar</button>
              <button style={{ ...S.btn.base, ...S.btn.primary }} onClick={doClose}>
                Cerrar caja 
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
