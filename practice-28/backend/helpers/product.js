function toPublicProduct(doc) {
  return {
    id: doc._id,
    title: doc.title,
    category: doc.category,
    description: doc.description,
    price: doc.price,
    stock: doc.stock ?? 0,
  };
}

function validateProductPayload(payload, { partial = false } = {}) {
  const { title, category, price } = payload;
  if (!partial || title !== undefined) {
    if (!title || !String(title).trim()) return "title обязателен";
  }
  if (!partial || category !== undefined) {
    const c = String(category || "").trim();
    if (!c) return "category обязателен";
  }
  if (!partial || price !== undefined) {
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) return "price должен быть положительным числом";
  }
  return null;
}

module.exports = { toPublicProduct, validateProductPayload };
