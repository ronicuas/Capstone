import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { API_BASE } from "../services/api";
import "../styles/inventory.css";

export default function Inventario() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm());

  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");

  function blankForm() {
    return {
      manualId: "",
      name: "",
      price: "",
      stock: "",
      sku: "",
      barcode: "",
      image: "",
      category_id: "",
      track: true,
      tax19: true,
    };
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/api/categories/").catch(() => ({ data: [] })),
      api.get("/api/products/").catch(() => ({ data: [] })),
    ])
      .then(([c, p]) => {
        setCategories(c.data || []);
        setProducts(p.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = products.filter((p) => {
      const byQ =
        !term ||
        (p.name || "").toLowerCase().includes(term) ||
        (p.sku || "").toLowerCase().includes(term) ||
        (p.barcode || "").toLowerCase().includes(term);
      const low = !lowOnly || (Number(p.stock) || 0) <= 5;
      return byQ && low;
    });

    const map = new Map();
    for (const c of categories) map.set(c.id, { category: c, items: [] });
    map.set("__none__", { category: { id: "__none__", name: "Sin categoría" }, items: [] });

    for (const p of list) {
      const cid = p.category?.id ?? p.category ?? "__none__";
      if (!map.has(cid)) map.set(cid, { category: { id: cid, name: "Otra" }, items: [] });
      map.get(cid).items.push(p);
    }
    for (const v of map.values()) v.items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return Array.from(map.values());
  }, [products, categories, q, lowOnly]);

  function openCreate(prefCatId = "") {
    setEditing(null);
    setForm({ ...blankForm(), category_id: prefCatId || "" });
    setFile(null);
    setPreview("");
    setShowNewCat(false);
    setNewCatName("");
    setOpen(true);
  }

  function openEdit(p) {
    setEditing(p);
    setForm({
      manualId: "",
      name: p.name || "",
      price: p.price ?? "",
      stock: p.stock ?? "",
      sku: p.sku || "",
      barcode: p.barcode || "",
      image: p.image || "",
      category_id: p.category?.id ?? p.category ?? "",
      track: true,
      tax19: true,
    });
    setFile(null);
    setPreview(p.image ? imgUrl(p.image) : "");
    setShowNewCat(false);
    setNewCatName("");
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setForm(blankForm());
    setShowNewCat(false);
    setNewCatName("");
    setFile(null);
    setPreview("");
  }

  function imgUrl(src) {
    if (!src) return "";
    return src.startsWith("http") ? src : `${API_BASE}${src}`;
  }

  function buildFormData(f, isEdit) {
    const fd = new FormData();
    if (!isEdit && (f.manualId || "").trim()) fd.append("id", f.manualId.trim());
    fd.append("name", (f.name || "").trim());
    fd.append("price", String(Number(f.price || 0)));
    fd.append("stock", String(Number(f.stock || 0)));
    fd.append("sku", (f.sku || "").trim());
    if ((f.barcode || "").trim()) fd.append("barcode", f.barcode.trim());
    fd.append("category_id", String(f.category_id));
    if (file) fd.append("image", file);
    return fd;
  }

  async function save() {
    if (!form.category_id) return alert("Selecciona una categoría.");
    if (!form.name.trim()) return alert("El nombre es obligatorio.");
    if (!String(form.price).trim()) return alert("El precio es obligatorio.");
    if (!form.sku.trim()) return alert("El SKU es obligatorio.");

    try {
      if (editing) {
        const fd = buildFormData(form, true);
        const { data } = await api.patch(`/api/products/${editing.id}/`, fd);
        setProducts((prev) => prev.map((p) => (p.id === editing.id ? data : p)));
      } else {
        const fd = buildFormData(form, false);
        const { data } = await api.post(`/api/products/`, fd);
        setProducts((prev) => [data, ...prev]);
      }
      closeModal();
    } catch (e) {
      console.error(e?.response?.data || e);
      alert("No se pudo guardar el producto.");
    }
  }

  async function remove(id) {
  if (!confirm("¿Eliminar este producto?")) return;
  try {
    await api.delete(`/api/products/${id}/`);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  } catch (e) {
    const msg =
      e?.response?.data?.detail ||
      e?.response?.data?.error ||
      "No se pudo eliminar.";
    alert(msg);
  }
}

  async function adjStock(p, delta) {
    try {
      const newStock = Math.max(0, (Number(p.stock) || 0) + delta);
      const fd = new FormData();
      fd.append("stock", String(newStock));
      if (p.category?.id ?? p.category) {
        fd.append("category_id", p.category?.id ?? p.category);
      }
      const { data } = await api.patch(`/api/products/${p.id}/`, fd);
      setProducts((prev) => prev.map((x) => (x.id === p.id ? data : x)));
    } catch {
      alert("No se pudo actualizar el stock.");
    }
  }

  async function quickAddCategory() {
    const name = (newCatName || "").trim();
    if (name.length < 2) return alert("Escribe un nombre de categoría.");
    try {
      const { data } = await api.post("/api/categories/", { name });
      setCategories((prev) => [...prev, data]);
      setForm((f) => ({ ...f, category_id: data.id }));
      setShowNewCat(false);
      setNewCatName("");
    } catch {
      alert("No se pudo crear la categoría.");
    }
  }

  return (
    <div className="page-plantitas dashboard-page inv-root inventory-page">
      <header className="dash-header inventory-head">
        <div className="brand">
          <div className="brand-logo" />
          <div>
            <h1 className="brand-title">Inventario</h1>
            <div className="brand-sub">Plantas y accesorios</div>
          </div>
        </div>
        <div className="inventory-controls">
          <input
            className="inp search"
            placeholder="Buscar por nombre, SKU o codigo de barras..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label className="chk">
            <input
              type="checkbox"
              checked={lowOnly}
              onChange={(e) => setLowOnly(e.target.checked)}
            />
            Stock bajo (≤5)
          </label>
        </div>
        <div className="header-actions">
          <button className="btn solid accent" onClick={() => openCreate()}>
            + Nuevo
          </button>
          <Link className="btn ghost accent" to="/">
            ← Volver al panel
          </Link>
        </div>
      </header>

      <section className="inv-board">
        {loading && <div className="loading">Cargando…</div>}

        {!loading &&
          grouped.map(({ category, items }) => (
            <div key={category.id} className="inv-col">
              <div className="col-head">
                <div className="title">{category.name}</div>
                <div className="count">{items.length}</div>
                <button className="mini" onClick={() => openCreate(category.id)}>
                  +
                </button>
              </div>

              <div className="col-body">
                {items.map((p) => (
                  <article key={p.id} className="prod-card">
                    <header className="pc-head">
                      <div className="pc-name">{p.name}</div>
                      <div className="pc-sku">{p.sku || "—"}</div>
                    </header>

                    <div className="pc-main">
                      <div className="pc-img">
                        {p.image ? (
                          <img src={imgUrl(p.image)} alt={p.name} />
                        ) : (
                          <div className="ph">🪴</div>
                        )}
                      </div>
                      <div className="pc-info">
                        <div className="price">{formatCLP(p.price ?? 0)}</div>
                        <div className="tax">19% IVA</div>
                        <div className="stock">
                          A la mano: <strong>{p.stock ?? 0}</strong> Unidades
                        </div>
                        <div className="stock-ops">
                          <button className="chip" onClick={() => adjStock(p, +1)}>+1</button>
                          <button className="chip" onClick={() => adjStock(p, +5)}>+5</button>
                          <button className="chip ghost" onClick={() => adjStock(p, -1)}>-1</button>
                        </div>
                      </div>
                    </div>

                    <footer className="pc-actions">
                      <button className="btn" onClick={() => openEdit(p)}>Editar</button>
                      <button className="btn danger" onClick={() => remove(p.id)}>Eliminar</button>
                    </footer>
                  </article>
                ))}

                {!items.length && <div className="empty-col">Sin productos</div>}
              </div>
            </div>
          ))}
      </section>

      {open && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{editing ? "Editar producto" : "Nuevo producto"}</h3>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <label>
                  <span>Producto</span>
                  <input
                    className="inp"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>

                {!editing && (
                  <label>
                    <span>ID (opcional)</span>
                    <input
                      className="inp"
                      value={form.manualId}
                      onChange={(e) => setForm({ ...form, manualId: e.target.value })}
                    />
                  </label>
                )}

                <label>
                  <span>Categoría</span>
                  <div className="cat-row">
                    <select
                      className="inp"
                      value={form.category_id ?? ""}
                      onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    >
                      <option value="">— Selecciona —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn mini"
                      onClick={() => { setShowNewCat((s) => !s); setNewCatName(""); }}
                    >
                      + Nueva
                    </button>
                  </div>

                  {showNewCat && (
                    <div className="inline-create">
                      <input
                        className="inp"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                      />
                      <button type="button" className="btn primary mini" onClick={quickAddCategory}>
                        Crear
                      </button>
                      <button type="button" className="btn ghost mini" onClick={() => { setShowNewCat(false); setNewCatName(""); }}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </label>

                <label>
                  <span>Precio</span>
                  <input
                    className="inp right"
                    type="number"
                    min="0"
                    step="100"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </label>

                <label>
                  <span>Stock</span>
                  <input
                    className="inp right"
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </label>

                <label>
                  <span>SKU</span>
                  <input
                    className="inp"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </label>

                <label>
                  <span>Código de barras</span>
                  <input
                    className="inp"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  />
                </label>

                <label className="col-span-2">
                  <span>Imagen</span>
                  <input
                    className="inp"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setFile(f);
                      setPreview(f ? URL.createObjectURL(f) : (form.image ? imgUrl(form.image) : ""));
                    }}
                  />
                  {preview ? (
                    <div style={{ marginTop: 8 }}>
                      <img src={preview} alt="preview" style={{ maxHeight: 120, borderRadius: 8 }} />
                    </div>
                  ) : null}
                </label>

                <div className="checkbox-row">
                  <label className="checkbox-card">
                    <input
                      type="checkbox"
                      checked={form.track}
                      onChange={(e) => setForm({ ...form, track: e.target.checked })}
                    />
                    <span>Rastrear inventario</span>
                  </label>

                  <label className="checkbox-card">
                    <input
                      type="checkbox"
                      checked={form.tax19}
                      onChange={(e) => setForm({ ...form, tax19: e.target.checked })}
                    />
                    <span>Impuesto 19% IVA</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn ghost" onClick={closeModal}>Cancelar</button>
              <button className="btn primary" onClick={save}>{editing ? "Guardar" : "Crear"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCLP(n) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}
