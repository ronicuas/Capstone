import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

const PAYMENT_LABELS = {
  efectivo: "Efectivo",
  debito: "Débito",
  credito: "Crédito",
  transferencia: "Transferencia",
};

const GRID = "2fr 0.8fr 0.8fr 0.8fr";
const backBtnStyle = {
  background: "#065f46",
  color: "#fff",
  padding: "10px 18px",
  borderRadius: 999,
  fontWeight: 600,
};

export default function Orders() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api
      .get("/api/orders/list/")
      .then((r) => setRows(r.data))
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401) setError("Debes iniciar sesión para ver los pedidos.");
        else setError(String(err?.response?.data?.detail || "No se pudieron cargar los pedidos."));
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((order) => {
      const code = (order.code || "").toLowerCase();
      const payment = (order.payment_method || "").toLowerCase();
      return code.includes(term) || payment.includes(term);
    });
  }, [rows, search]);

  const renderRow = (order, index) => {
    const products = order.items?.reduce((acc, it) => acc + (it.quantity || 0), 0) || 0;
    const isEven = index % 2 === 0;
    return (
      <div
        key={order.id}
        className="tr"
        style={{
          gridTemplateColumns: GRID,
          cursor: "pointer",
          background: isEven ? "#f9fafb" : "white",
        }}
        onClick={() => navigate(`/orders/${order.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") navigate(`/orders/${order.id}`);
        }}
      >
        <div className="td" style={{ fontWeight: 600 }}>
          <div>{order.code}</div>
          <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 400 }}>
            {formatDate(order.created_at)}
          </div>
        </div>
        <div className="td" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Productos</div>
          <div style={{ fontWeight: 600 }}>{products || "—"}</div>
        </div>
        <div className="td" style={{ textAlign: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 90,
              padding: "4px 12px",
              borderRadius: 999,
              background: "#ecfdf5",
              color: "#047857",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {PAYMENT_LABELS[order.payment_method] || order.payment_method || "—"}
          </span>
        </div>
        <div className="td" style={{ textAlign: "center", fontWeight: 600 }}>
          {formatCLP(order.total)}
        </div>
      </div>
    );
  };

  return (
    <div className="page page-plantitas">
      <div className="dash-header">
        <div className="brand">
          <div className="brand-logo" />
          <div>
            <h1 className="brand-title">Ventas del punto</h1>
            <div className="brand-sub">Historial de tickets registrados en caja</div>
          </div>
        </div>
        <div className="header-actions">
          <Link className="btn" style={backBtnStyle} to="/">
            ← Volver al panel
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <input
          className="inp"
          placeholder="Buscar por código o método de pago..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <div className="auth-error" style={{ margin: 0 }}>
            {error}
            {error.includes("iniciar sesión") && (
              <>
                {" "}
                <Link to="/login">Ir al login</Link>
              </>
            )}
          </div>
        </div>
      )}

      <div
        className="card"
        style={{
          padding: 0,
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#065f46",
            color: "white",
            padding: "12px 24px",
            fontWeight: 600,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Últimas ventas</span>
          <span style={{ fontSize: 13, opacity: 0.9 }}>
            {filtered.length} ticket{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading && <div style={{ padding: 20 }}>Cargando pedidos...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: 20 }}>No hay registros que coincidan con tu búsqueda.</div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="table" style={{ borderTop: "1px solid #e5e7eb" }}>
            <div
              className="thead"
              style={{
                gridTemplateColumns: GRID,
                background: "#f1f5f9",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              <div className="th" style={{ textAlign: "left", paddingLeft: 16 }}>
                Código
              </div>
              <div className="th">Productos</div>
              <div className="th">Pago</div>
              <div className="th">Total</div>
            </div>
            <div className="tbody">{filtered.map((o, idx) => renderRow(o, idx))}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-CL");
}

function formatCLP(n) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}
