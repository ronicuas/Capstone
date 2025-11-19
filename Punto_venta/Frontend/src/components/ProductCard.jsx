export default function ProductCard({ product, onAdd }) {
  const low = product.stock <= 5;
  return (
    <div className="shop-card">
      <div className="shop-img" aria-label={product.name}>
        {product.image ? (
          <img src={product.image} alt={product.name} />
        ) : (
          <div className="shop-img-ph">🌿</div>
        )}
        {low && <span className="badge-warn">Pocas unidades</span>}
      </div>
      <div className="shop-info">
        <div className="shop-name">{product.name}</div>
        <div className="shop-meta">
          <span className="shop-price">{formatCLP(product.price)}</span>
          <button className="btn tiny primary" onClick={() => onAdd(product)}>Agregar</button>
        </div>
      </div>
    </div>
  );
}

function formatCLP(n) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}
