export default function ProductItem({ product, onView, onEdit, onDelete, canEdit, canDelete, onAddToCart }) {
  const hasActions = Boolean(onView || (canEdit && onEdit) || (canDelete && onDelete));
  const inStock = product.stock > 0;

  return (
    <div className="productCard">
      <div className="productCard__header">
        <span className="productCategory">{product.category}</span>
        <span className={`productStock ${inStock ? "productStock--in" : "productStock--out"}`}>
          {inStock ? `В наличии: ${product.stock}` : "Нет в наличии"}
        </span>
      </div>
      <div className="productCard__body">
        <div className="productTitle">{product.title}</div>
        <div className="productDesc">{product.description}</div>
      </div>
      <div className="productCard__footer">
        <span className="productPrice">{product.price.toLocaleString("ru-RU")} ₽</span>
        <div className="productActions">
          {onAddToCart && inStock && (
            <button className="btn btn--sm btn--cart" onClick={() => onAddToCart(product)}>
              + В корзину
            </button>
          )}
          {onView && (
            <button className="btn btn--sm" onClick={() => onView(product.id)}>Подробнее</button>
          )}
          {canEdit && onEdit && (
            <button className="btn btn--sm" onClick={() => onEdit(product)}>Редактировать</button>
          )}
          {canDelete && onDelete && (
            <button className="btn btn--sm btn--danger" onClick={() => onDelete(product.id)}>Удалить</button>
          )}
        </div>
      </div>
    </div>
  );
}
