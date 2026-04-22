export default function ProductItem({
  product,
  onView,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}) {
  const hasActions = Boolean(onView || (canEdit && onEdit) || (canDelete && onDelete));

  return (
    <div className="productCard">
      <div className="productCard__header">
        <span className="productCategory">{product.category}</span>
      </div>
      <div className="productCard__body">
        <div className="productTitle">{product.title}</div>
        <div className="productDesc">{product.description}</div>
      </div>
      <div className="productCard__footer">
        <span className="productPrice">
          {product.price.toLocaleString("ru-RU")} ₽
        </span>
        {hasActions ? (
          <div className="productActions">
            {onView ? (
              <button className="btn btn--sm" onClick={() => onView(product.id)}>
                Подробнее
              </button>
            ) : null}
            {canEdit && onEdit ? (
              <button className="btn btn--sm" onClick={() => onEdit(product)}>
                Редактировать
              </button>
            ) : null}
            {canDelete && onDelete ? (
              <button
                className="btn btn--sm btn--danger"
                onClick={() => onDelete(product.id)}
              >
                Удалить
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
