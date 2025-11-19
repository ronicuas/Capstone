// src/services/kpi.js

import api from "./api"; 

export const kpiOverview           = (params) => api.get("/api/kpi/overview/",            { params });
export const kpiTopProductos       = (params) => api.get("/api/kpi/top-productos/",       { params });
export const kpiMesMayorVenta      = (params) => api.get("/api/kpi/mes-mayor-venta/",     { params });
export const kpiVentasPorMes       = (params) => api.get("/api/kpi/ventas-por-mes/",      { params });
export const kpiVentasPorCategoria = (params) => api.get("/api/kpi/ventas-por-categoria/",{ params });
export const kpiMediosPago         = (params) => api.get("/api/kpi/medios-pago/",         { params });
export const kpiPromedioDiario     = (params) => api.get("/api/kpi/promedio-diario/",     { params });

export const kpiExportExcel = (report, params) =>
  api.get("/api/kpi/export-excel/", { params: { report, ...(params || {}) }, responseType: "blob" });

export const kpiExportPDF = (report, params) =>
  api.get("/api/kpi/export-pdf/", { params: { report, ...(params || {}) }, responseType: "blob" });


export const reportQuery = (spec) =>
  api.post("/api/reportes/query/", spec, { responseType: "json" });

export const reportExport = (format, spec = {}) =>
  api.get("/api/reportes/export/", {
    params: {
      format,
      // spec -> querystring
      start:        spec.filters?.start,
      end:          spec.filters?.end,
      categoria:    spec.filters?.categoria,
      producto:     spec.filters?.producto,
      medio_pago:   spec.filters?.medio_pago,
      dimension:    spec.dimension,
      metrics:      (spec.metrics || []).join(","),     // csv
      sort_by:      spec.sort?.by,
      sort_dir:     spec.sort?.dir,
      limit:        spec.limit,
      columns:      (spec.columns || []).join(","),     // csv
      size:         spec.size,                          // a4 | oficio | legal | letter
      orientation:  spec.orientation,                   // portrait | landscape
    },
    responseType: "blob",
  });