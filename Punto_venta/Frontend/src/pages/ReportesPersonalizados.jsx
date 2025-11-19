// src/pages/ReportesPersonalizados.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { reportQuery, reportExport } from "../services/kpi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/perso.css";

const CLP = (n) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(+n) ? +n : 0);

const FMT = (s) => (s ? new Date(s).toLocaleDateString("es-CL") : "—");

const DEFAULT_COLUMNS = [
  "producto",
  "categoria",
  "cantidad",
  "precio_unitario",
  "monto",
  "precio_promedio",
  "stock_actual",
  "ultima_venta",
  "rotacion_diaria",

];

const COLUMN_LABEL = {
  producto: "Producto",
  categoria: "Categoría",
  cantidad: "Cant. vendida",
  precio_unitario: "Precio unitario",
  monto: "Total vendido",
  precio_promedio: "Precio promedio",
  stock_actual: "Stock actual",
  ultima_venta: "Última venta",
  rotacion_diaria: "Rotación diaria",
};

// columnas numéricas -> alinear a la derecha
const NUMERIC_COLS = new Set([
  "cantidad",
  "precio_unitario",
  "monto",
  "precio_promedio",
  "stock_actual",
  "rotacion_diaria",
  "margen_pct",
]);

// ====== Utilidades de export local (usa lo que ves en la tabla) ======
const OFICIO_PORTRAIT = [612, 936]; // 8.5 x 13 in → 612 x 936 pt
const MARGIN = { left: 36, right: 36, top: 40, bottom: 40 };
const fmtISO = (s) => (s ? new Date(s).toISOString().slice(0, 10) : "—");

function tableRowsTo2D(rows, columns) {
  return rows.map((r) =>
    columns.map((c) => {
      const v = r?.[c];
      if (c === "monto" || c === "precio_unitario" || c === "precio_promedio") return CLP(v);
      if (c === "ultima_venta") return fmtISO(v);
      if (c === "rotacion_diaria") return v == null ? "—" : Number(v).toFixed(2);
      return v ?? "—";
    })
  );
}

// PDF (oficio) con lo que ves en la tabla
function exportPDFDesdeTabla({ titulo, filters, rows, columns, labels }) {
  const doc = new jsPDF({ unit: "pt", orientation: "portrait", format: OFICIO_PORTRAIT, compress: true });

  const start = filters?.start ? fmtISO(filters.start) : "—";
  const end = filters?.end ? fmtISO(filters.end) : "—";

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.text(titulo, MARGIN.left, MARGIN.top);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Período: ${start} a ${end}`, MARGIN.left, MARGIN.top + 16);

  const head = [
    columns.map((c) => (labels?.[c] || c).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())),
  ];
  const body = tableRowsTo2D(rows, columns);

  autoTable(doc, {
    startY: MARGIN.top + 28,
    head,
    body,
    styles: { font: "Helvetica", fontSize: 9, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [46, 125, 50], textColor: 255, halign: "center" },
    margin: { left: MARGIN.left, right: MARGIN.right, bottom: MARGIN.bottom },
    didDrawPage: () => {
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Página ${doc.internal.getNumberOfPages()}`, pw - MARGIN.right, ph - 14, { align: "right" });
    },
  });

  return doc;
}

// Excel (XLSX) con lo que ves en la tabla
function exportExcelDesdeTabla({ titulo, filters, rows, columns, labels }) {
  const header = columns.map((c) => labels?.[c] || c);
  const body = tableRowsTo2D(rows, columns);

  const sheetData = [header, ...body];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Auto width simple
  const colWidths = header.map((_, j) => {
    const maxLen = Math.max(...sheetData.map((r) => String(r?.[j] ?? "").length));
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");

  const s = filters?.start ? fmtISO(filters.start) : "ini";
  const e = filters?.end ? fmtISO(filters.end) : "fin";
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([wbout], { type: "application/octet-stream" }),
    `${titulo.replace(/\s+/g, "_").toLowerCase()}_${s}_${e}.xlsx`
  );
}

export default function ReportTabla({ initialFilters }) {
  // 🔒 Skin de la página para anular gradiente azul global
  useEffect(() => {
    document.body.classList.add("inv-skin");
    return () => document.body.classList.remove("inv-skin");
  }, []);

  const [filters, setFilters] = useState(
    initialFilters || { start: "", end: "", categoria: null, producto: null, medio_pago: null }
  );
  const dimension = "producto";
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [sortBy, setSortBy] = useState("monto");
  const [sortDir, setSortDir] = useState("desc");
  const [limit, setLimit] = useState(1000);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialFilters) setFilters((f) => ({ ...f, ...initialFilters }));
  }, [initialFilters]);

  useEffect(() => {
    if (filters.start && filters.end) run(); // auto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.start, filters.end]);

  const spec = useMemo(
    () => ({
      filters,
      dimension,
      metrics: [
        "cantidad",
        "monto",
        "precio_unitario",
        "precio_promedio",
        "stock_actual",
        "ultima_venta",
        "rotacion_diaria",
        "margen_pct",
      ],
      sort: { by: sortBy, dir: sortDir },
      limit,
      columns,
      table: true,
    }),
    [filters, columns, sortBy, sortDir, limit]
  );

  // Normaliza filas entrantes a las claves esperadas por la tabla
  function normalizeRows(input) {
    if (!Array.isArray(input)) return [];
    return input.map((r) => {
      const producto =
        r.producto ??
        r.product_name ??
        r["producto__nombre"] ??
        r["product__name"] ??
        r.name ??
        r.label ??
        "—";

      const categoria =
        r.categoria ??
        r["product__category__name"] ??
        r["producto__categoria__nombre"] ??
        r.category ??
        r.category_name ??
        "—";

      const safeNum = (v, d = 0) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : d;
      };

      return {
        producto,
        categoria,
        cantidad: safeNum(r.cantidad ?? r.qty ?? r.quantity, 0),
        precio_unitario: safeNum(r.precio_unitario ?? r.price, 0),
        monto: safeNum(r.monto ?? r.total, 0),
        precio_promedio: safeNum(r.precio_promedio ?? r.avg_price ?? r.price_avg, 0),
        stock_actual: safeNum(r.stock_actual ?? r.stock, 0),
        ultima_venta: r.ultima_venta ?? r.last_sale ?? null,
        rotacion_diaria: r.rotacion_diaria ?? r.rotation ?? null,
        margen_pct: r.margen_pct ?? r.margin ?? null,
      };
    });
  }

  async function run() {
    setLoading(true);
    setError("");
    try {
      const { data } = await reportQuery(spec);
      setRows(normalizeRows(data));
    } catch (e) {
      setRows([]);
      setError(e?.response?.data?.detail || e.message || "Error al consultar el informe");
    } finally {
      setLoading(false);
    }
  }

  function toggleCol(c) {
    setColumns((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  }

  function fmtCell(key, val) {
    if (key === "precio_unitario" || key === "precio_promedio" || key === "monto") return CLP(val);
    if (key === "margen_pct") return val == null ? "—" : `${(Number(val) * 100).toFixed(1)}%`;
    if (key === "ultima_venta") return FMT(val);
    if (key === "rotacion_diaria") return val == null ? "—" : Number(val).toFixed(2);
    return val ?? "—";
  }

  function fmtDateForName(s) {
    if (!s) return "";
    return new Date(s).toISOString().slice(0, 10);
  }

  // ===== Handlers de exportación =====
  async function exportPDFOficio() {
    const metricsArr = [
      "cantidad",
      "monto",
      "precio_unitario",
      "precio_promedio",
      "stock_actual",
      "ultima_venta",
      "rotacion_diaria",
      "margen_pct",
    ];

    try {
      // 1) intenta backend
      const beSpec = {
        filters,
        dimension: "producto",
        metrics: metricsArr,
        sort: { by: sortBy, dir: sortDir },
        limit,
        columns,
        size: "oficio",
        orientation: "portrait",
      };
      const res = await reportExport("pdf", beSpec);
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `informe_productos_${fmtDateForName(filters.start)}_${fmtDateForName(filters.end)}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
    } catch {
      // 2) fallback 100% cliente (con lo visible en la tabla)
      const doc = exportPDFDesdeTabla({
        titulo: "Informe de Productos",
        filters,
        rows,
        columns,
        labels: COLUMN_LABEL,
      });
      doc.save(`informe_productos_${fmtDateForName(filters.start)}_${fmtDateForName(filters.end)}.pdf`);
    }
  }

  async function imprimirPDFOficio() {
    const metricsArr = [
      "cantidad",
      "monto",
      "precio_unitario",
      "precio_promedio",
      "stock_actual",
      "ultima_venta",
      "rotacion_diaria",
      "margen_pct",
    ];

    try {
      const beSpec = {
        filters,
        dimension: "producto",
        metrics: metricsArr,
        sort: { by: sortBy, dir: sortDir },
        limit,
        columns,
        size: "oficio",
        orientation: "portrait",
      };
      const res = await reportExport("pdf", beSpec);
      const url = URL.createObjectURL(res.data);
      const w = window.open(url, "_blank");
      if (!w) alert("Habilita ventanas emergentes para imprimir.");
    } catch {
      const doc = exportPDFDesdeTabla({
        titulo: "Informe de Productos",
        filters,
        rows,
        columns,
        labels: COLUMN_LABEL,
      });
      const blobUrl = doc.output("bloburl");
      const w = window.open(blobUrl, "_blank");
      if (!w) alert("Habilita ventanas emergentes para imprimir.");
    }
  }

  async function exportExcel() {
    const metricsArr = [
      "cantidad",
      "monto",
      "precio_unitario",
      "precio_promedio",
      "stock_actual",
      "ultima_venta",
      "rotacion_diaria",
      "margen_pct",
    ];

    try {
      const beSpec = {
        filters,
        dimension: "producto",
        metrics: metricsArr,
        sort: { by: sortBy, dir: sortDir },
        limit,
        columns,
      };
      const res = await reportExport("excel", beSpec);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `informe_productos_${fmtDateForName(filters.start)}_${fmtDateForName(filters.end)}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
    } catch {
      // fallback local XLSX
      exportExcelDesdeTabla({
        titulo: "Informe de Productos",
        filters,
        rows,
        columns,
        labels: COLUMN_LABEL,
      });
    }
  }

  const subtitle =
    filters?.start || filters?.end
      ? `Período: ${FMT(filters.start)} – ${FMT(filters.end)}`
      : "Filtros y tabla personalizable";

  return (
    <div className="page-plantitas dashboard-page reports-perso">

      <header className="dash-header">
        <div className="brand">
          <div className="brand-logo" />
          <div>
            <h1 className="brand-title">Informe de Productos</h1>
            <div className="brand-sub">{subtitle}</div>
          </div>
        </div>
        <div className="header-actions">
          <Link className="btn ghost accent" to="/">
            ← Volver al panel
          </Link>
        </div>
      </header>

      {/* CONTENIDO */}
      <section className="card filters-card">
        <div className="card-head">
          <h3>Informe de Productos </h3>
        </div>

        <div className="card-body filters-body">
          <div className="filters-row">
            <input
              type="date"
              className="btn ghost"
              value={filters.start || ""}
              onChange={(e) => setFilters((f) => ({ ...f, start: e.target.value }))}
            />
            <input
              type="date"
              className="btn ghost"
              value={filters.end || ""}
              onChange={(e) => setFilters((f) => ({ ...f, end: e.target.value }))}
            />
            <select className="btn ghost" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="monto">Ordenar por: Total vendido</option>
              <option value="cantidad">Ordenar por: Cantidad</option>
              <option value="precio_promedio">Ordenar por: Precio promedio</option>
              <option value="stock_actual">Ordenar por: Stock</option>
            </select>
            <select className="btn ghost" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>

            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              Top N:
              <input
                className="btn ghost"
                type="number"
                min="1"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value || "1"))}
              />
            </label>

            <button className="btn solid accent" disabled={loading} onClick={run}>
              {loading ? "Cargando…" : "Consultar"}
            </button>
            <button className="btn solid secondary" onClick={exportExcel}>
              Excel
            </button>
            <button className="btn solid secondary" onClick={exportPDFOficio}>
              PDF 
            </button>
            <button className="btn solid secondary" onClick={imprimirPDFOficio}>
              Imprimir 
            </button>
          </div>

          <div className="card columns-card">
            <b>Columnas:</b>
            <div className="column-grid">
              {Object.keys(COLUMN_LABEL).map((c) => (
                <label key={c} className="column-chip">
                  <input type="checkbox" checked={columns.includes(c)} onChange={() => toggleCol(c)} />
                  {COLUMN_LABEL[c]}
                </label>
              ))}
            </div>
          </div>

          {/* Errores */}
          {error && (
            <div className="alert error">
              {error}
            </div>
          )}

          {/* Tabla */}
          <div className="card table-card">
            {loading ? (
              <div className="table-placeholder">Cargando…</div>
            ) : rows.length === 0 ? (
              <div className="table-placeholder muted">
                Sin datos para los filtros seleccionados
              </div>
            ) : (
              <div className="table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      {columns.map((c) => {
                        const cls =
                          c === "stock_actual"
                            ? "rt-stock"
                            : c === "ultima_venta"
                            ? "rt-fecha"
                            : NUMERIC_COLS.has(c)
                            ? "rt-num"
                            : "";
                        return (
                          <th key={c} className={cls}>
                            {COLUMN_LABEL[c] || c}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        {columns.map((c) => {
                          const cls =
                            c === "stock_actual"
                              ? "rt-stock"
                              : c === "ultima_venta"
                              ? "rt-fecha"
                              : NUMERIC_COLS.has(c)
                              ? "rt-num"
                              : "";
                          return (
                            <td key={c} className={cls}>
                              {fmtCell(c, r[c])}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
