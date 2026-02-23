import React from "react";

const CATEGORY_COLORS = {
  Ноутбуки: "#6366f1",
  Смартфоны: "#ec4899",
  Аудиотехника: "#f59e0b",
  "Игровые консоли": "#06b6d4",
  Гаджеты: "#8b5cf6",
};

export default function ProductItem({ product, onEdit, onDelete }) {
  const catColor = CATEGORY_COLORS[product.category] || "#6366f1";
  const stars =
    "★".repeat(Math.round(product.rating)) +
    "☆".repeat(5 - Math.round(product.rating));

  return (
    <div className="productCard">
      <div className="productCard__header">
        <span
          className="productCategory"
          style={{ borderColor: catColor, color: catColor }}
        >
          {product.category}
        </span>
        <span className="productRating" title={`Рейтинг: ${product.rating}`}>
          {stars} <span className="ratingNum">{product.rating}</span>
        </span>
      </div>
      <div className="productCard__body">
        <div className="productName">{product.name}</div>
        <div className="productDesc">{product.description}</div>
      </div>
      <div className="productCard__footer">
        <div className="productMeta">
          <span className="productPrice">
            {product.price.toLocaleString("ru-RU")} ₽
          </span>
          <span
            className={`productStock ${
              product.stock === 0 ? "productStock--out" : ""
            }`}
          >
            {product.stock === 0
              ? "Нет в наличии"
              : `На складе: ${product.stock} шт.`}
          </span>
        </div>
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
