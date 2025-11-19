
import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { createOrder } from "../services/orders";

export default function CheckoutModal({ open, onClose, onSuccess }) {
  const { items, subtotal, clear } = useCart();
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "",
    delivery: "retiro", address: "", notes: "",
    payment: "efectivo"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (!open) { setError(""); setLoading(false); } }, [open]);
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.fullName.trim() || !form.phone.trim()) {
      setError("Por favor completa al menos nombre y teléfono.");
      return;
    }
    if (form.delivery === "envio" && !form.address.trim()) {
      setError("Indica la dirección para el envío.");
      return;
    }
    if (items.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        customer: {
          full_name: form.fullName,
          email: form.email || null,
          phone: form.phone,
        },
        delivery: {
          mode: form.delivery,
          address: form.delivery === "envio" ? form.address : null,
          notes: form.notes || ""
        },
        payment_method: form.payment,
        items: items.map((it) => ({ product_id: it.id, quantity: it.qty })),
      };

      const order = await createOrder(payload);
      clear();
      onSuccess?.(order);
      onClose();
    } catch (err) {
      const data = err?.response?.data;
      let msg = data?.detail;

      if (!msg && data && typeof data === "object") {
        for (const [k, v] of Object.entries(data)) {
          if (typeof v === "string" && v) { msg = v; break; }
          if (Array.isArray(v) && v.length) {
            msg = typeof v[0] === "string" ? v[0] : (v[0]?.message || JSON.stringify(v[0]));
            break;
          }
        }
      }
      setError(msg || "No se pudo procesar la orden.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-head">
          <h3>Finalizar compra</h3>
          <button className="btn ghost" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={onSubmit}>
          <div className="grid2">
            <div className="f">
              <label>Nombre completo</label>
              <input className="inp" name="fullName" value={form.fullName} onChange={onChange} />
            </div>
            <div className="f">
              <label>Correo (opcional)</label>
              <input className="inp" type="email" name="email" value={form.email} onChange={onChange} />
            </div>
            <div className="f">
              <label>Teléfono</label>
              <input className="inp" name="phone" value={form.phone} onChange={onChange} />
            </div>
            <div className="f">
              <label>Entrega</label>
              <select className="inp" name="delivery" value={form.delivery} onChange={onChange}>
                <option value="retiro">Retiro en tienda</option>
                <option value="envio">Envío a domicilio</option>
              </select>
            </div>
            {form.delivery === "envio" && (
              <div className="f" style={{ gridColumn: "1 / -1" }}>
                <label>Dirección</label>
                <input className="inp" name="address" value={form.address} onChange={onChange} />
              </div>
            )}
            <div className="f" style={{ gridColumn: "1 / -1" }}>
              <label>Notas para el pedido (opcional)</label>
              <textarea className="inp" rows={3} name="notes" value={form.notes} onChange={onChange} />
            </div>
            <div className="f" style={{ gridColumn: "1 / -1" }}>
              <label>Método de pago</label>
              <div className="chips">
                {["efectivo","debito","credito","transferencia"].map(p => (
                  <button
                    type="button"
                    key={p}
                    className={"chip " + (form.payment===p ? "active" : "")}
                    onClick={() => setForm({ ...form, payment: p })}
                  >
                    {p.charAt(0).toUpperCase()+p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-summary">
            <div>Subtotal</div>
            <div><strong>{formatCLP(subtotal)}</strong></div>
          </div>

          {error && <div className="auth-error" style={{marginTop:8}}>{error}</div>}

          <div className="modal-foot">
            <button className="btn" type="button" onClick={onClose}>Cancelar</button>
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Procesando..." : "Confirmar pedido"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatCLP(n) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}
