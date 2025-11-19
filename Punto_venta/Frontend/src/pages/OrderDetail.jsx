import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

const PAYMENT_LABELS = {
  efectivo: "Efectivo",
  debito: "Débito",
  credito: "Crédito",
  transferencia: "Transferencia",
};

const STATUS_LABELS = {
  paid: "Pagada",
  cancelled: "Cancelada",
};

const layoutStyle = { width: "100%" };
const blockSpacing = { marginTop: 12 };
const cardPadding = { padding: "24px 32px" };
const backBtnStyle = {
  background: "#065f46",
  color: "#fff",
  padding: "10px 18px",
  borderRadius: 999,
  fontWeight: 600,
};

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/api/orders/${id}/`)
      .then((response) => setOrder(response.data))
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401) setError("Debes iniciar sesión para ver este pedido.");
        else if (status === 404) setError("Pedido no encontrado.");
        else setError(String(err?.response?.data?.detail || "No se pudo cargar el pedido."));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const createdAtLabel = useMemo(() => {
    if (!order?.created_at) return "Detalle del pedido";
    return formatDate(order.created_at);
  }, [order?.created_at]);

  const items = order?.items ?? [];
  const productsCount = useMemo(
    () => items.reduce((acc, item) => acc + (item.quantity || 0), 0),
    [items],
  );

  const total = Number(order?.total || 0);
  const neto = total ? Math.round(total / 1.19) : 0;
  const iva = total - neto;

  return (
    <div className="page page-plantitas" style={{ display: "flex", justifyContent: "center" }}>
      <div style={layoutStyle}>
      <div className="dash-header">
        <div className="brand" style={{ alignItems: "center" }}>
          <div className="brand-logo" />
          <div>
            <h1 className="brand-title">
              Venta {order?.code ? `#${order.code}` : ""}
            </h1>
            <div className="brand-sub">{createdAtLabel}</div>
          </div>
        </div>
        <div className="header-actions">
          <Link className="btn" style={backBtnStyle} to="/orders">
            ← Volver a ventas
          </Link>
        </div>
      </div>

      {loading && <div className="card">Cargando venta...</div>}

      {!loading && error && (
        <div className="card">
          <div className="auth-error">{error}</div>
        </div>
      )}

      {!loading && !error && order && (
        <>
          <div className="grid2" style={{ gap: 12 }}>
            <div className="card" style={cardPadding}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>Resumen de venta</h3>
                <StatusChip label={STATUS_LABELS[order.status] || "Registrada"} />
              </div>
              <DetailRow label="Código" value={order.code} />
              <DetailRow label="Fecha" value={formatDate(order.created_at)} />
              <DetailRow label="Productos" value={productsCount || "—"} />
              <DetailRow label="Total" value={formatCLP(total)} />
            </div>

            <div className="card" style={cardPadding}>
              <h3 style={{ marginBottom: 12 }}>Pago</h3>
              <DetailRow
                label="Método"
                value={PAYMENT_LABELS[order.payment_method] || order.payment_method || "—"}
              />
              <DetailRow label="Neto" value={formatCLP(neto)} />
              <DetailRow label="IVA (19%)" value={formatCLP(iva)} />
              <DetailRow label="Total cobrado" value={formatCLP(total)} />
            </div>
          </div>

          <div className="card" style={{ ...blockSpacing, ...cardPadding }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Ítems vendidos</h3>
              <strong>{formatCLP(total)}</strong>
            </div>
            <div className="table" style={{ marginTop: 12, width: "100%" }}>
              <div className="thead" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
                <div className="th">Producto</div>
                <div className="th" style={{ textAlign: "center" }}>Cantidad</div>
                <div className="th" style={{ textAlign: "center" }}>Precio</div>
                <div className="th" style={{ textAlign: "center" }}>Total</div>
              </div>
              <div className="tbody">
                {items.map((item, idx) => (
                  <div
                    key={`${item.sku || item.product}-${idx}`}
                    className="tr"
                    style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}
                  >
                    <div className="td">
                      <div>{item.product || "Producto"}</div>
                      {item.sku && (
                        <div style={{ color: "#6b7280", fontSize: 12 }}>{item.sku}</div>
                      )}
                    </div>
                    <div className="td" style={{ textAlign: "center", fontWeight: 600 }}>
                      {item.quantity}
                    </div>
                    <div className="td" style={{ textAlign: "center" }}>
                      {item.discount_pct ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <span style={{ textDecoration: "line-through", color: "#6b7280", fontSize: 12 }}>
                            {formatCLP(item.price_base || item.price)}
                          </span>
                          <span style={{ color: "#dc2626", fontWeight: 700 }}>
                            {formatCLP(item.price)}
                          </span>
                          <span style={{ fontSize: 12, color: "#047857", fontWeight: 600 }}>
                            -{item.discount_pct}%
                          </span>
                        </div>
                      ) : (
                        formatCLP(item.price)
                      )}
                    </div>
                    <div className="td" style={{ textAlign: "center" }}>{formatCLP(item.line_total)}</div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="tr">
                    <div className="td">No se registraron productos.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

function StatusChip({ label }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 12px",
        borderRadius: 999,
        background: "rgba(6, 95, 70, 0.12)",
        color: "#065f46",
        fontWeight: 600,
        fontSize: 12,
        letterSpacing: 0.3,
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}

function DetailRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 24,
        marginBottom: 10,
        fontSize: 14,
      }}
    >
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value || "—"}</span>
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
