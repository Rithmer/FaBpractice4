export default function ProductItem({ product, onEdit, onDelete }) {
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
        <div className="productActions">
          <button className="btn btn--sm" onClick={() => onEdit(product)}>
            Редактировать
          </button>
          <button
            className="btn btn--sm btn--danger"
            onClick={() => onDelete(product.id)}
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
