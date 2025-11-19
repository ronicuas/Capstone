// src/pages/Shop.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { API_BASE } from "../services/api";
import "../styles/shop.css";

// ✅ Modal de cierre de caja (arqueo)
import CloseCashModal from "../components/CloseCashModal";

export default function Shop() {
  const navigate = useNavigate();

  // ===== Datos desde backend (categorías y productos) =====
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api
      .get("/api/categories/")
      .then((r) => setCategories(r.data))
      .catch(() => setCategories([]));
    api
      .get("/api/products/")
      .then((r) => setProducts(r.data))
      .catch(() => setProducts([]));
  }, []);

  // ===== Filtros =====
  const [query, setQuery] = useState("");
  const [catId, setCatId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => (Number(p.stock) || 0) > 0)
      .filter((p) => {
        const matchCat = catId ? (p.category?.id ?? p.category) === catId : true;
        const name = (p.name || "").toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        return matchCat && (!q || name.includes(q) || sku.includes(q));
      });
  }, [products, query, catId]);

  // ===== Carrito =====
  const [cart, setCart] = useState([]);
  const TAX_RATE = 0.19;
  const total = cart.reduce((acc, line) => acc + Number(line.price || 0) * line.qty, 0);
  const neto = total ? Math.round(total / (1 + TAX_RATE)) : 0;
  const tax = Math.max(0, total - neto);

  function addToCart(prod) {
    const unit = prod.price_discounted ?? prod.price;
    setCart((c) => {
      const i = c.findIndex((x) => x.id === prod.id);
      if (i >= 0) {
        const copy = [...c];
        copy[i] = { ...copy[i], qty: copy[i].qty + 1 };
        return copy;
      }
      return [
        ...c,
        {
          id: prod.id,
          name: prod.name,
          price: unit,
          qty: 1,
          discount_pct: prod.discount_pct || 0,
          basePrice: prod.price,
        },
      ];
    });
  }
  function decQty(id) {
    setCart((c) =>
      c
        .map((l) =>
          l.id === id ? { ...l, qty: Math.max(0, l.qty - 1) } : l
        )
        .filter((l) => l.qty > 0)
    );
  }
  function incQty(id) {
    setCart((c) => c.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l)));
  }
  function removeLine(id) {
    setCart((c) => c.filter((l) => l.id !== id));
  }

  function pay() {
    if (!cart.length) return;
    // Guarda info mínima para pantalla de pago
    sessionStorage.setItem("pos_cart", JSON.stringify(cart));
    sessionStorage.setItem("pos_totals", JSON.stringify({ neto, tax, total }));
    navigate("/shop/success"); // pantalla de método de pago
  }

  // ===== Modal de arqueo/cierre =====
  const [showClose, setShowClose] = useState(false);

  return (
    <div className="pos-wrap pos-no-pad">
      {/* Panel izquierdo: carrito */}
      <aside className="pos-aside">
        <div className="ticket-head">
          <button className="order-number">PEDIDO</button>
        </div>

        <div className="cart-list">
          {cart.length === 0 && <div className="empty">Sin productos</div>}
          {cart.map((l) => (
            <div key={l.id} className="cart-line">
              <div className="line-title">
                {l.name}
                <button className="line-del" onClick={() => removeLine(l.id)}>
                  ✕
                </button>
              </div>
              <div className="line-meta">
                <div className="qty-ctrl">
                  <button onClick={() => decQty(l.id)}>-</button>
                  <span className="qty">{l.qty}</span>
                  <button onClick={() => incQty(l.id)}>+</button>
                </div>
                <span className="x">×</span>
                <span className="unit cart-price-block">
                  {l.discount_pct ? (
                    <>
                      <span className="price-old">{formatCLP(l.basePrice || l.price)}</span>
                      <span className="price-new">{formatCLP(l.price)}</span>
                    </>
                  ) : (
                    formatCLP(l.price)
                  )}
                </span>
                <span className="grow" />
                <strong>{formatCLP(l.price * l.qty)}</strong>
              </div>
            </div>
          ))}
        </div>

        <div className="totals">
          <div className="row">
            <span>Neto</span>
            <span>{formatCLP(neto)}</span>
          </div>
          <div className="row">
            <span>IVA (incluido)</span>
            <span>{formatCLP(tax)}</span>
          </div>
          <div className="row total">
            <span>Total</span>
            <span>{formatCLP(total)}</span>
          </div>
        </div>

        <div className="paybar single">
          <button
            className={`pay ${cart.length ? "" : "disabled"}`}
            onClick={pay}
          >
            Pagar
          </button>
        </div>
      </aside>

      {/* Principal: buscador, cabecera y grid */}
      <main className="pos-main">
        <header className="pos-topbar">
          <div className="brand">Plantitas POS</div>
          <input
            className="search"
            placeholder="Buscar plantas, maceteros, tierra..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {/* Botones a la derecha */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {/* Volver al Dashboard */}
            <button
              className="btn ghost"
              onClick={() => navigate("/")}
              title="Volver al panel"
            >
              Volver al panel
            </button>
            {/* Cierre de caja */}
            <button className="btn primary" onClick={() => setShowClose(true)}>
              Cierre de caja
            </button>
          </div>
        </header>

        <div className="cat-strip">
          {categories.map((c) => (
            <button
              key={c.id}
              className={`cat ${catId === c.id ? "active" : ""}`}
              onClick={() => setCatId((prev) => (prev === c.id ? null : c.id))}
              title={c.name}
            >
              <span className="cat-ic">🪴</span>
              <span className="cat-tx">{c.name}</span>
            </button>
          ))}
        </div>

        <div className="grid-products">
          {filtered.map((p) => {
            const hasDiscount = Number(p.discount_pct || 0) > 0;
            const priceFinal = p.price_discounted ?? p.price;
            return (
              <button key={p.id} className="prod" onClick={() => addToCart(p)}>
                <div className="pic">
                  <img
                    src={p.image?.startsWith("http") ? p.image : `${API_BASE}${p.image}`}
                    alt={p.name}
                  />
                  {hasDiscount && <span className="discount-flag">-{p.discount_pct}%</span>}
                </div>
                <div className="pname">{p.name}</div>
                <div className="pprice">
                  {hasDiscount ? (
                    <>
                      <span className="price-old">{formatCLP(p.price)}</span>
                      <span className="price-new">{formatCLP(priceFinal)}</span>
                    </>
                  ) : (
                    formatCLP(priceFinal)
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Modal de cierre de caja */}
      <CloseCashModal
  open={showClose}
  onClose={() => setShowClose(false)}
  onClosed={() => {
    setShowClose(false);
    navigate("/cash/open");   // ⬅️ abrir caja de inmediato
  }}
/>

    </div>
  );
}

function formatCLP(n) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}
