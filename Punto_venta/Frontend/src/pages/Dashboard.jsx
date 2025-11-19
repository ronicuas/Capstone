import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";

const NOTE_KEY = "dashboard_notes";
const DEFAULT_NOTES = [
  "Revisar proveedor de rosas (precio subió 4%).",
  "Programar campaña Día de la Madre.",
  "Etiquetas nuevas para ramos Deluxe.",
];

export default function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    ventasHoy: 0,
    ticketsHoy: 0,
    ticketPromedio: 0,
    lowStockCount: 0,
  });
  const [ventas7, setVentas7] = useState([]);
  const [topProductos, setTopProductos] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [notes, setNotes] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(NOTE_KEY) || "[]");
      return Array.isArray(stored) && stored.length ? stored : DEFAULT_NOTES;
    } catch {
      return DEFAULT_NOTES;
    }
  });
  const [noteInput, setNoteInput] = useState("");

  // ===== Configuración de zona horaria =====
  const TZ = "America/Santiago";
  const ymd = (d) =>
    new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d);
  const parseCreatedAt = (s) => {
    const hasTZ = /Z|[+-]\d{2}:\d{2}$/.test(s);
    return new Date(hasTZ ? s : `${s}Z`);
  };
  const dayLabel = (d) =>
    new Intl.DateTimeFormat("es-CL", { weekday: "short", timeZone: TZ })
      .format(d)
      .replace(".", "")
      .replace(/^./, (c) => c.toUpperCase());

  // ===== Lógica principal =====
  useEffect(() => {
    async function fetchData() {
      try {
        const [{ data: orders }, { data: products }, { data: alertsData }] = await Promise.all([
          api.get("/api/orders/list/"),
          api.get("/api/products/"),
          api.get("/api/alerts/?resuelta=false"),
        ]);

        const now = new Date();
        const hoy = ymd(now);

        const orderDay = (o) => ymd(parseCreatedAt(o.created_at));

        // Ventas del día y tickets
        const ordersHoy = orders.filter((o) => orderDay(o) === hoy);
        const ventasHoy = ordersHoy.reduce(
          (acc, o) => acc + Number(o.total || 0),
          0
        );
        const ticketsHoy = ordersHoy.length;
        const ticketPromedio =
          ticketsHoy > 0 ? Math.round(ventasHoy / ticketsHoy) : 0;

        // Stock bajo
        const low = products
          .filter((p) => (Number(p.stock) || 0) <= 5)
          .map((p) => ({ sku: p.sku, nombre: p.name, stock: p.stock }));

        // Top productos vendidos
        const allItems = orders.flatMap((o) => o.items || []);
        const grouped = {};
        for (const it of allItems) {
          const key = it.sku || it.product;
          if (!grouped[key])
            grouped[key] = { nombre: it.product, vendidos: 0, ingreso: 0 };
          grouped[key].vendidos += Number(it.quantity || 0);
          grouped[key].ingreso += Number(it.line_total || 0);
        }
        const top = Object.values(grouped)
          .sort((a, b) => b.ingreso - a.ingreso)
          .slice(0, 5);

        // Ventas últimos 7 días
        const dias = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now);
          d.setDate(d.getDate() - (6 - i));
          return d;
        });
        const serie = dias.map((d) => {
          const dStr = ymd(d);
          return orders
            .filter((o) => orderDay(o) === dStr)
            .reduce((acc, o) => acc + Number(o.total || 0), 0);
        });

        setStats({
          ventasHoy,
          ticketsHoy,
          ticketPromedio,
          lowStockCount: low.length,
        });
        setLowStock(low);
        setTopProductos(top);
        setVentas7(serie);
        setAlertas(Array.isArray(alertsData) ? alertsData : []);
      } catch (err) {
        console.error("Error cargando datos del dashboard:", err);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem(NOTE_KEY, JSON.stringify(notes));
  }, [notes]);

  function handleAddNote(e) {
    e.preventDefault();
    const value = noteInput.trim();
    if (!value) return;
    setNotes((prev) => [...prev, value]);
    setNoteInput("");
  }

  function handleDeleteNote(idx) {
    setNotes((prev) => prev.filter((_, i) => i !== idx));
  }

  // ===== Render =====
  const alertasRiego = alertas.filter((a) => a.tipo === "RIEGO");
  const alertasOfertaVida = alertas.filter((a) =>
    ["SOBRESTOCK", "VIDA_UTIL"].includes(a.tipo)
  );

  return (
    <div className="page page-plantitas dashboard-page">
      {/* Header */}
      <header className="dash-header">
        <div className="brand">
          <div className="brand-logo" />
          <div>
            <h1 className="brand-title">Plantitas donde la Fran</h1>
            <div className="brand-sub">Panel principal</div>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid kpis">
        <Kpi title="Ventas de hoy" value={formatCLP(stats.ventasHoy)} hint="INGRESO BRUTO" />
        <Kpi title="Tickets" value={stats.ticketsHoy} hint="TRANSACCIONES" />
        <Kpi title="Ticket promedio" value={formatCLP(stats.ticketPromedio)} hint="POR TICKET" />
        <Kpi title="Stock bajo" value={stats.lowStockCount} hint="PRODUCTOS" warn />
      </section>

      {/* 3 columnas */}
      <section className="main-grid">
        <Card title="Ventas últimos 7 días">
          <Bars data={ventas7} dayLabel={dayLabel} />
        </Card>

        <Hub />

        <Card title="Top productos">
          <Table
            columns={["Producto", "Vendidos", "Ingreso"]}
            rows={topProductos.map((p) => [
              p.nombre,
              p.vendidos,
              formatCLP(p.ingreso),
            ])}
          />
        </Card>
      </section>

      {/* Abajo: stock bajo + notas */}
      <section className="grid two">
        <Card title="Stock bajo">
          <Table
            columns={["SKU", "Producto", "Stock"]}
            rows={lowStock.map((i) => [i.sku, i.nombre, i.stock])}
          />
        </Card>

        <Card title="Notas / recordatorios">
          <form className="note-form" onSubmit={handleAddNote}>
            <input
              className="inp"
              placeholder="Escribe un recordatorio..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
            />
            <button className="btn primary note-add" type="submit">
              Agregar
            </button>
          </form>

          <ul className="notes">
            {notes.length === 0 && <li className="note-empty">Sin notas por ahora.</li>}
            {notes.map((n, idx) => (
              <li key={`${n}-${idx}`}>
                <span>{n}</span>
                <button
                  type="button"
                  className="note-remove"
                  onClick={() => handleDeleteNote(idx)}
                  aria-label="Eliminar nota"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Alertas clave */}
      <section className="grid two">
        <Card title="Problemas de riego">
          {alertasRiego.length === 0 ? (
            <div className="muted">Sin alertas de riego.</div>
          ) : (
            <Table
              columns={["Producto", "Mensaje", "Nivel"]}
              rows={alertasRiego.map((a) => [
                a.producto?.name || "—",
                a.mensaje,
                a.nivel,
              ])}
            />
          )}
        </Card>

        <Card title="Sugerencias de oferta">
          {alertasOfertaVida.length === 0 ? (
            <div className="muted">Sin alertas de sobrestock o vida útil.</div>
          ) : (
            <Table
              columns={["Producto", "Mensaje", "Nivel", "Tipo"]}
              rows={alertasOfertaVida.map((a) => [
                a.producto?.name || "—",
                a.mensaje,
                a.nivel,
                a.tipo,
              ])}
            />
          )}
        </Card>
      </section>
    </div>
  );
}

/* ---------- Componentes ---------- */
function Kpi({ title, value, hint, warn = false }) {
  return (
    <div className={`card kpi ${warn ? "warn" : ""}`}>
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-hint">{hint}</div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="card">
      <div className="card-head">
        <h3>{title}</h3>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function Table({ columns, rows }) {
  return (
    <div className="table">
      <div className="thead">
        {columns.map((c, i) => (
          <div key={i} className="th">
            {c}
          </div>
        ))}
      </div>
      <div className="tbody">
        {rows.map((r, i) => (
          <div key={i} className="tr">
            {r.map((cell, j) => (
              <div key={j} className="td">
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Bars({ data, dayLabel }) {
  const max = Math.max(...data, 1);
  const labels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return dayLabel(d);
  });

  return (
    <div className="bars">
      {data.map((v, i) => {
        const h = Math.round((v / max) * 100);
        return (
          <div key={i} className="bar">
            <div className="bar-label">{labels[i]}</div>
            <div className="bar-fill" style={{ height: `${h}%` }} />
            <div className="bar-val">{shortCLP(v)}</div>
          </div>
        );
      })}
    </div>
  );
}

/* HUB central con botones grandes */
function Hub() {
  const navigate = useNavigate();
  const { user } = useAuth(); // tu contexto ya tiene user.role o user.groups

  // ---- Define permisos por rol ----
  const role = user?.role || "none";
  const canAccess = {
    shop: ["vendedor", "admin"],
    inventario: ["bodegero", "admin"],
    orders: ["vendedor", "admin"],
    reports: ["admin"],
  };

  // ---- Helper para estilos ----
  const btnClass = (routeKey) => {
    const allowed = canAccess[routeKey]?.includes(role);
    return `tile ${allowed ? "tile-active" : "tile-disabled"}`;
  };

  // ---- Helper para click ----
  const handleClick = (routeKey, path) => {
    if (canAccess[routeKey]?.includes(role)) navigate(path);
  };

  // ====== NUEVO: decidir destino según caja abierta ======
  const isCashOpen = () => {
    try {
      return !!JSON.parse(localStorage.getItem("cash_state") || "{}")?.open;
    } catch {
      return false;
    }
  };
  const goToPOS = () => {
    const dest = isCashOpen() ? "/shop" : "/cash/open";
    handleClick("shop", dest);
  };

  return (
    <div className="hub">
      <button
        className={btnClass("shop")}
        onClick={goToPOS}
      >
        <span className="tile-emoji">🧾</span>
        <span className="tile-title">Punto de venta</span>
        <span className="tile-sub">Cobrar / Registrar ventas</span>
      </button>

      <button
        className={btnClass("inventario")}
        onClick={() => handleClick("inventario", "/inventario")}
      >
        <span className="tile-emoji">📚</span>
        <span className="tile-title">Inventario</span>
        <span className="tile-sub">Productos y stock</span>
      </button>

      <button
        className={btnClass("orders")}
        onClick={() => handleClick("orders", "/orders")}
      >
        <span className="tile-emoji">📊</span>
        <span className="tile-title">Ventas</span>
        <span className="tile-sub">Historial de ventas</span>
      </button>
      <button
        className={btnClass("reports")}
        onClick={() => handleClick("reports", "/reports")}
      >
        <span className="tile-emoji">📋</span>
        <span className="tile-title">Informes</span>
        <span className="tile-sub">Informes de ventas</span>
      </button>
    </div>
  );
}

/* ---------- Utils ---------- */
function formatCLP(n) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function shortCLP(n) {
  const k = Math.round(n / 1000);
  return `$${k}k`;
}
