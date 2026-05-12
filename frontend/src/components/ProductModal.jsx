import { useState } from "react";

export default function ProductModal({ open, mode, initialProduct, categories = [], onClose, onSubmit }) {
  const [form, setForm] = useState(() => ({
    title: initialProduct?.title ?? "",
    category: initialProduct?.category ?? "",
    description: initialProduct?.description ?? "",
    price: initialProduct?.price != null ? String(initialProduct.price) : "",
    stock: initialProduct?.stock != null ? String(initialProduct.stock) : "0",
  }));

  if (!open) return null;

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    const category = form.category.trim();
    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!title) return alert("Введите название");
    if (!category) return alert("Введите категорию");
    if (!Number.isFinite(price) || price <= 0) return alert("Введите корректную цену");
    if (!Number.isFinite(stock) || stock < 0) return alert("Количество не может быть отрицательным");

    onSubmit({ id: initialProduct?.id, title, category, description: form.description.trim(), price, stock });
  };

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">{mode === "edit" ? "Редактирование товара" : "Добавление товара"}</div>
          <button className="iconBtn" onClick={onClose}>✕</button>
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <label className="label">
            Название
            <input className="input" value={form.title} onChange={set("title")} placeholder="Название товара" autoFocus />
          </label>
          <label className="label">
            Категория
            <input className="input" value={form.category} onChange={set("category")} placeholder="Введите или выберите категорию" list="category-list" />
            <datalist id="category-list">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>
          <label className="label">
            Описание
            <textarea className="input textarea" value={form.description} onChange={set("description")} placeholder="Описание товара" rows={3} />
          </label>
          <label className="label">
            Цена (₽)
            <input className="input" value={form.price} onChange={set("price")} placeholder="990" inputMode="numeric" />
          </label>
          <label className="label">
            Количество на складе
            <input className="input" value={form.stock} onChange={set("stock")} placeholder="0" inputMode="numeric" />
          </label>
          <div className="modal__footer">
            <button type="button" className="btn" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn--primary">{mode === "edit" ? "Сохранить" : "Добавить"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
