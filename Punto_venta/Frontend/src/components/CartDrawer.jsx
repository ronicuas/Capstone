import { useCart } from "../context/CartContext";

export default function CartDrawer({ open, onClose, onCheckout }) {
  const { items, setQty, remove, subtotal, clear } = useCart();

  return (
    <div className={`drawer ${open ? "open" : ""}`}>
      <div className="drawer-head">
        <h3>Carrito</h3>
        <button className="btn ghost" onClick={onClose}>Cerrar</button>
      </div>

      <div className="drawer-body">
        {items.length === 0 ? (
          <div className="empty">Tu carrito está vacío 🌱</div>
        ) : (
          items.map((it) => (
            <div key={it.id} className="cart-row">
              <div className="cart-info">
                <div className="cart-name">{it.name}</div>
                <div className="cart-sku">{it.sku}</div>
              </div>
              <div className="cart-qty">
                <button className="btn tiny" onClick={() => setQty(it.id, Math.max(1, it.qty - 1))}>−</button>
                <input
                  className="qty-input"
                  type="number"
                  min="1"
                  value={it.qty}
                  onChange={(e) => setQty(it.id, parseInt(e.target.value || "1"))}
                />
                <button className="btn tiny" onClick={() => setQty(it.id, it.qty + 1)}>+</button>
              </div>
              <div className="cart-price">
                {formatCLP(it.qty * it.price)}
                {it.discount_pct ? (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "rgba(0,0,0,0.5)",
                    }}
                  >
                    -{it.discount_pct}% de {formatCLP(it.basePrice || it.price)}
                  </div>
                ) : null}
              </div>
              <button className="btn tiny ghost" onClick={() => remove(it.id)}>✕</button>
            </div>
          ))
        )}
      </div>

      <div className="drawer-foot">
        <div className="cart-sub">
          <span>Subtotal</span>
          <strong>{formatCLP(subtotal)}</strong>
        </div>
        <div className="foot-actions">
          <button className="btn" onClick={clear}>Vaciar</button>
          <button className="btn primary" onClick={onCheckout}>Procesar compra</button>
        </div>
      </div>
    </div>
  );
}

function formatCLP(n) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}
