import React, { useState } from "react";

const CATEGORIES = [
  "Ноутбуки",
  "Смартфоны",
  "Аудиотехника",
  "Игровые консоли",
  "Гаджеты",
];

export default function ProductModal({
  open,
  mode,
  initialProduct,
  onClose,
  onSubmit,
}) {

  const [form, setForm] = useState(() => ({
    name: initialProduct?.name ?? "",
    category: initialProduct?.category ?? "Ноутбуки",
    description: initialProduct?.description ?? "",
    price: initialProduct?.price != null ? String(initialProduct.price) : "",
    stock: initialProduct?.stock != null ? String(initialProduct.stock) : "",
    rating: initialProduct?.rating != null ? String(initialProduct.rating) : "",
  }));

  if (!open) return null;

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = form.name.trim();
    const price = Number(form.price);
    const stock = Number(form.stock);
    const rating = Number(form.rating);

    if (!trimmed) return alert("Введите название");
    if (!Number.isFinite(price) || price <= 0)
      return alert("Введите корректную цену");
    if (!Number.isFinite(stock) || stock < 0)
      return alert("Введите корректное количество");
    if (!Number.isFinite(rating) || rating < 0 || rating > 5)
      return alert("Рейтинг от 0 до 5");

    onSubmit({
      id: initialProduct?.id,
      name: trimmed,
      category: form.category,
      description: form.description.trim(),
      price,
      stock,
      rating,
    });
  };

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal__header">
          <div className="modal__title">
            {mode === "edit" ? "Редактирование товара" : "Добавление товара"}
          </div>
          <button className="iconBtn" onClick={onClose}>
            ✕
          </button>
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <label className="label">
            Название
            <input
              className="input"
              value={form.name}
              onChange={set("name")}
              placeholder="Название товара"
              autoFocus
            />
          </label>
          <label className="label">
            Категория
            <select
              className="input"
              value={form.category}
              onChange={set("category")}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Описание
            <textarea
              className="input textarea"
              value={form.description}
              onChange={set("description")}
              placeholder="Краткое описание товара"
              rows={3}
            />
          </label>
          <div className="formRow">
            <label className="label">
              Цена (₽)
              <input
                className="input"
                value={form.price}
                onChange={set("price")}
                placeholder="490"
                inputMode="numeric"
              />
            </label>
            <label className="label">
              На складе (шт.)
              <input
                className="input"
                value={form.stock}
                onChange={set("stock")}
                placeholder="10"
                inputMode="numeric"
              />
            </label>
            <label className="label">
              Рейтинг (0–5)
              <input
                className="input"
                value={form.rating}
                onChange={set("rating")}
                placeholder="4.5"
                inputMode="decimal"
              />
            </label>
          </div>
          <div className="modal__footer">
            <button type="button" className="btn" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn--primary">
              {mode === "edit" ? "Сохранить" : "Добавить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}