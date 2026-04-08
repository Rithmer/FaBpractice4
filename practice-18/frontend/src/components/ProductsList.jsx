import ProductItem from "./ProductItem";

export default function ProductsList({
  products,
  onView,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}) {
  if (!products.length) {
    return <div className="empty">Товаров пока нет.</div>;
  }

  return (
    <div className="grid">
      {products.map((p) => (
        <ProductItem
          key={p.id}
          product={p}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
}
