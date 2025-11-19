// src/pages/Reports.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  kpiOverview,
  kpiTopProductos,
  kpiMesMayorVenta,
  kpiVentasPorMes,
  kpiVentasPorCategoria,
  kpiMediosPago,
  kpiPromedioDiario,
  kpiExportExcel, 
  kpiExportPDF,
} from "../services/kpi";

import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";

// helpers descarga
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}


const CLP = (n) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n || 0);
const MIN_MONTHLY_TARGET = 400000;

export default function Reports() {
  // --------- estado ----------
  const navigate = useNavigate();
  const [range, setRange] = useState({ start: "", end: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [overview, setOverview] = useState(null);
  const [topProd, setTopProd] = useState([]);
  const [porMes, setPorMes] = useState([]);
  const [porCat, setPorCat] = useState([]);
  const [medios, setMedios] = useState([]);
  const [promDiario, setPromDiario] = useState([]);
  const [mesMayor, setMesMayor] = useState([]);

  // --------- params ----------
  const params = useMemo(() => {
    const p = {};
    if (range.start) p.start = range.start;
    if (range.end) p.end = range.end;
    return p;
  }, [range]);

  // --------- paleta desde variables CSS (con fallback) ----------
  const PALETTE = useMemo(() => {
    if (typeof window === "undefined") {
      return ["#2E7D32", "#66BB6A", "#FFC107", "#E53935", "#455A64", "#8D6E63"];
    }
    const cs = getComputedStyle(document.documentElement);
    const v = (name, fb) => (cs.getPropertyValue(name)?.trim() || fb);
    return [
      v("--primary", "#2E7D32"),
      v("--primary-light", "#66BB6A"),
      v("--warn", "#FFC107"),
      v("--error", "#E53935"),
      "#455A64",
      "#8D6E63",
    ];
  }, []);

  // --------- carga ----------
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [ov, tp, mm, pm, pc, mp, pd] = await Promise.all([
        kpiOverview(params),
        kpiTopProductos(params),
        kpiMesMayorVenta(params),
        kpiVentasPorMes(params),
        kpiVentasPorCategoria(params),
        kpiMediosPago(params),
        kpiPromedioDiario(params),
      ]);
      setOverview(ov.data);
      setTopProd(tp.data);
      setMesMayor(mm.data);
      setPorMes(pm.data || []);
      setPorCat(pc.data);
      setMedios(mp.data);
      setPromDiario(pd.data);
    } catch (e) {
      console.error("KPI load failed:", e);
      setError(e?.response?.data?.detail || e.message || "Error cargando KPIs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page-plantitas">
      {/* ===== Header ===== */}
      <header className="dash-header">
        <div className="brand">
          <div className="brand-logo" />
          <div>
            <h1 className="brand-title">Reportes de Ventas</h1>
            <div className="brand-sub">KPIs • Evolución • Top productos</div>
          </div>
        </div>
        <div className="card" style={{marginTop: 12}}>
  <div className="card-head"><h3>Exportar reportes</h3></div>
  <div className="card-body" style={{display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>
    <select id="repSel" className="btn ghost" style={{color:"#2E7D32", borderColor:"var(--primary)", background:"#fff"}}>
      <option value="ventas">Ventas (detalle) </option>
      <option value="productos">Productos</option>
      <option value="medios">Medios de pago</option>
      <option value="categorias">Categorías</option>
    </select>
    <button className="btn solid" onClick={async ()=>{
      const report = document.getElementById("repSel").value;
      const res = await kpiExportExcel(report, params);
      downloadBlob(res.data, `reporte_${report}.xlsx`);
    }}>Excel</button>

    <button className="btn solid" onClick={async ()=>{
      const report = document.getElementById("repSel").value;
      const res = await kpiExportPDF(report, params);
      downloadBlob(res.data, `reporte_${report}.pdf`);
    }}>PDF</button>
  </div>
</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="date"
            value={range.start}
            onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
            className="btn ghost"
            style={{ background: "transparent", color: "#fff", borderColor: "#fff" }}
          />
          <input
            type="date"
            value={range.end}
            onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
            className="btn ghost"
            style={{ background: "transparent", color: "#fff", borderColor: "#fff" }}
          />
          <button className="btn ghost" onClick={load} disabled={loading}>
            {loading ? "Cargando..." : "Aplicar"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <button
            className="btn solid accent"
            type="button"
            onClick={() => navigate("/ReportesPersonalizados")}
          >
            Reportes personalizados
          </button>
          <button
            className="btn ghost accent"
            type="button"
            onClick={() => navigate("/")}
          >
            ← Volver al panel
          </button>
        </div>
      </header>

      {error && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 12px",
            border: "1px solid var(--error)",
            color: "var(--error)",
            borderRadius: 10,
            background: "#FFF5F5",
          }}
        >
          {error}
        </div>
      )}

      {/* ===== KPIs ===== */}
      <section className="grid kpis">
        <article className="kpi card">
          <div className="card-head">
            <h3>Total Ventas</h3>
          </div>
          <div className="card-body">
            <div className="kpi-value">{overview ? CLP(overview.total_ventas) : "-"}</div>
            <div className="kpi-hint">Monto total en el período</div>
          </div>
        </article>

        <article className="kpi card">
          <div className="card-head">
            <h3>Tickets</h3>
          </div>
          <div className="card-body">
            <div className="kpi-value">{overview ? overview.tickets : "-"}</div>
            <div className="kpi-hint">Boletas/órdenes pagadas</div>
          </div>
        </article>

        <article className="kpi card">
          <div className="card-head">
            <h3>Items Vendidos</h3>
          </div>
          <div className="card-body">
            <div className="kpi-value">{overview ? overview.total_items : "-"}</div>
            <div className="kpi-hint">Unidades totales</div>
          </div>
        </article>

        <article className="kpi card">
          <div className="card-head">
            <h3>Ticket Promedio</h3>
          </div>
          <div className="card-body">
            <div className="kpi-value">{overview ? CLP(overview.ticket_promedio) : "-"}</div>
            <div className="kpi-hint">Promedio por ticket</div>
          </div>
        </article>
      </section>

      {/* ===== Evolución + Resúmenes + Torta ===== */}
      <section className="main-grid">
        {/* Evolución mensual */}
        <article className="card">
          <div className="card-head">
            <h3>Evolución mensual</h3>
          </div>
          <div className="card-body" style={{ height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={porMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="x" tick={{ fill: "var(--text-sec)" }} axisLine={{ stroke: "var(--border)" }} />
                <YAxis tick={{ fill: "var(--text-sec)" }} axisLine={{ stroke: "var(--border)" }} domain={[0, "auto"]} />
                <Tooltip formatter={(v) => CLP(v)} />
                <Line type="monotone" dataKey="y" stroke="var(--primary)" />
                <ReferenceLine
                  y={MIN_MONTHLY_TARGET}
                  stroke="#fbbf24"
                  strokeDasharray="6 6"
                  label={{ value: "Meta 400K", fill: "#fbbf24", position: "right" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Resúmenes */}
        <div className="card">
          <div className="card-head">
            <h3>Resúmenes</h3>
          </div>
          <div className="card-body">
            <ul className="notes">
              <li>
                <strong>Mes top:</strong>{" "}
                {mesMayor?.[0]?.label ? `${mesMayor[0].label} — ${CLP(mesMayor[0].value)}` : "—"}
              </li>
              <li>
                <strong>Prom. diario:</strong>{" "}
                {promDiario?.[0]?.value ? CLP(promDiario[0].value) : CLP(0)}
              </li>
            </ul>
          </div>
        </div>

        {/* Medios de pago (torta) */}
        <article className="card">
          <div className="card-head">
            <h3>Medios de pago</h3>
          </div>
          <div className="card-body" style={{ height: 320 }}>
            <ResponsiveContainer>
                <PieChart>
                 <Tooltip formatter={(v, _n, p) => [`${v} (${p?.payload?.porcentaje ?? 0}%)`, p?.payload?.label]} />
                 <Legend verticalAlign="bottom" />
                <Pie
                  data={medios}
                  dataKey="value"
                  nameKey="label"
                  label={({ name, value, percent, payload }) =>
                    `${name}: ${value} (${payload?.porcentaje ?? (percent * 100).toFixed(0)}%)`
                  }
                 labelLine
                 outerRadius="80%"
               >
                  {medios.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      {/* ===== Top productos + Categorías ===== */}
      <section className="grid two">
        {/* Top productos (barras con colores variados) */}
        <article className="card">
          <div className="card-head">
            <h3>Top productos (por cantidad)</h3>
          </div>
          <div className="card-body" style={{ height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={topProd}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill: "var(--text-sec)" }} axisLine={{ stroke: "var(--border)" }} />
                <YAxis tick={{ fill: "var(--text-sec)" }} axisLine={{ stroke: "var(--border)" }} />
                <Tooltip />
                <Bar dataKey="value">
                  {topProd.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Categorías (barras con color de marca) */}
        <article className="card">
          <div className="card-head">
            <h3>Ingresos por categoría</h3>
          </div>
          <div className="card-body" style={{ height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={porCat}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill: "var(--text-sec)" }} axisLine={{ stroke: "var(--border)" }} />
                <YAxis tick={{ fill: "var(--text-sec)" }} axisLine={{ stroke: "var(--border)" }} />
                <Tooltip formatter={(v) => CLP(v)} />
                <Bar dataKey="value" fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
    </div>
  );
}
