// src/pages/BooksPage/BooksPage.jsx
// GraphQL-каталог товаров — демонстрация Apollo Client (Практика 26)
// Данные загружаются через GraphQL (Apollo Server, порт 4000),
// независимо от основного REST API (порт 3000).

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_PRODUCTS,
  GET_CATEGORIES,
  CREATE_PRODUCT,
  CREATE_CATEGORY,
} from "../../apollo/queries";
import "./BooksPage.scss";

// ── Карточка товара ───────────────────────────────────
function ProductCard({ product, onSelect }) {
  return (
    <div className="book-card" onClick={() => onSelect(product)}>
      <div className="book-card__genre">{product.category.name}</div>
      <h3 className="book-card__title">{product.title}</h3>
      <div className="book-card__year">
        {product.price.toLocaleString("ru-RU")} ₽
      </div>
      <div className={`book-card__stock ${product.inStock ? "book-card__stock--yes" : "book-card__stock--no"}`}>
        {product.inStock ? "✅ В наличии" : "❌ Нет в наличии"}
      </div>
      {product.description && (
        <p className="book-card__desc">{product.description}</p>
      )}
    </div>
  );
}

// ── Модальное окно деталей товара ─────────────────────
function ProductModal({ product, onClose }) {
  if (!product) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose}>✕</button>
        <div className="modal__genre">{product.category.name}</div>
        <h2 className="modal__title">{product.title}</h2>
        <div className="modal__meta">
          <span>💰 {product.price.toLocaleString("ru-RU")} ₽</span>
          <span>{product.inStock ? "✅ В наличии" : "❌ Нет в наличии"}</span>
        </div>
        {product.description && (
          <p className="modal__desc">{product.description}</p>
        )}
      </div>
    </div>
  );
}

// ── Форма добавления товара ───────────────────────────
function CreateProductForm({ categories, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    price: "",
    description: "",
    inStock: true,
    categoryId: categories[0]?.id ?? "",
  });
  const [error, setError] = useState("");

  const [createProduct, { loading }] = useMutation(CREATE_PRODUCT, {
    refetchQueries: [{ query: GET_PRODUCTS }],
    onCompleted: (data) => {
      onCreated(data.createProduct);
      setForm({
        title: "",
        price: "",
        description: "",
        inStock: true,
        categoryId: categories[0]?.id ?? "",
      });
    },
    onError: (err) => setError(err.message),
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.categoryId) { setError("Выберите категорию"); return; }
    const price = parseFloat(form.price);
    if (!price || price <= 0) { setError("Введите корректную цену"); return; }
    createProduct({
      variables: {
        title: form.title,
        price,
        description: form.description || undefined,
        inStock: form.inStock,
        categoryId: form.categoryId,
      },
    });
  };

  return (
    <form className="gql-form" onSubmit={handleSubmit}>
      <h3 className="gql-form__title">➕ Добавить товар</h3>

      <input
        className="gql-input"
        name="title"
        placeholder="Название товара"
        value={form.title}
        onChange={handleChange}
        required
      />
      <input
        className="gql-input"
        name="price"
        type="number"
        placeholder="Цена (₽)"
        value={form.price}
        onChange={handleChange}
        required
      />
      <input
        className="gql-input"
        name="description"
        placeholder="Описание (необязательно)"
        value={form.description}
        onChange={handleChange}
      />
      <select
        className="gql-input"
        name="categoryId"
        value={form.categoryId}
        onChange={handleChange}
        required
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <label className="gql-checkbox">
        <input
          type="checkbox"
          name="inStock"
          checked={form.inStock}
          onChange={handleChange}
        />
        В наличии
      </label>

      {error && <div className="gql-error">{error}</div>}
      <button className="gql-btn" type="submit" disabled={loading}>
        {loading ? "Сохранение..." : "Добавить товар"}
      </button>
    </form>
  );
}

// ── Форма добавления категории ────────────────────────
function CreateCategoryForm({ onCreated }) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");

  const [createCategory, { loading }] = useMutation(CREATE_CATEGORY, {
    refetchQueries: [{ query: GET_CATEGORIES }],
    onCompleted: (data) => {
      onCreated(data.createCategory);
      setForm({ name: "", description: "" });
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    createCategory({
      variables: {
        name: form.name,
        description: form.description || undefined,
      },
    });
  };

  return (
    <form className="gql-form" onSubmit={handleSubmit}>
      <h3 className="gql-form__title">➕ Добавить категорию</h3>
      <input
        className="gql-input"
        name="name"
        placeholder="Название категории"
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        required
      />
      <input
        className="gql-input"
        name="description"
        placeholder="Описание (необязательно)"
        value={form.description}
        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
      />
      {error && <div className="gql-error">{error}</div>}
      <button className="gql-btn" type="submit" disabled={loading}>
        {loading ? "Сохранение..." : "Добавить категорию"}
      </button>
    </form>
  );
}

// ── Главная страница GraphQL-каталога ─────────────────
export default function BooksPage() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activePanel, setActivePanel] = useState("products");
  const [search, setSearch] = useState("");
  const [notification, setNotification] = useState("");

  const { data: productsData, loading: productsLoading, error: productsError } =
    useQuery(GET_PRODUCTS);
  const { data: categoriesData, loading: categoriesLoading } =
    useQuery(GET_CATEGORIES);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const products = productsData?.products ?? [];
  const categories = categoriesData?.categories ?? [];

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.category.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="books-page">
      {notification && <div className="books-notif">{notification}</div>}

      {/* Заголовок */}
      <div className="books-header">
        <div>
          <h2 className="books-header__title">✨ Расширенный каталог</h2>
          <p className="books-header__sub">
            Новинки и расширенный ассортимент — поиск, фильтр по категориям, наличие
          </p>
        </div>
        <div className="books-header__badge">
          <span className="gql-badge">Новинки</span>
        </div>
      </div>

      {/* Навигация */}
      <div className="books-nav">
        {[
          { key: "products", label: `Товары (${products.length})` },
          { key: "categories", label: `Категории (${categories.length})` },
          { key: "addProduct", label: "+ Товар" },
          { key: "addCategory", label: "+ Категория" },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`books-nav__btn ${activePanel === key ? "books-nav__btn--active" : ""}`}
            onClick={() => setActivePanel(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Список товаров ── */}
      {activePanel === "products" && (
        <>
          <input
            className="gql-search"
            placeholder="Поиск по названию или категории..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {productsLoading && (
            <div className="books-status">⏳ Загрузка расширенного каталога...</div>
          )}
          {productsError && (
            <div className="books-status books-status--err">
              ❌ {productsError.message}
              <br />
              <small>Убедитесь, что сервис расширенного каталога запущен</small>
            </div>
          )}
          {!productsLoading && filteredProducts.length === 0 && (
            <div className="books-status">Товары не найдены</div>
          )}
          <div className="books-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={setSelectedProduct}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Список категорий ── */}
      {activePanel === "categories" && (
        <div className="authors-list">
          {categoriesLoading && (
            <div className="books-status">⏳ Загрузка категорий...</div>
          )}
          {categories.map((cat) => (
            <div key={cat.id} className="author-card">
              <h3 className="author-card__name">{cat.name}</h3>
              {cat.description && (
                <p className="author-card__bio">{cat.description}</p>
              )}
              <div className="author-card__books">
                {cat.products.length === 0
                  ? "Нет товаров"
                  : cat.products.map((p) => (
                      <span key={p.id} className="author-card__book-chip">
                        {p.title} — {p.price.toLocaleString("ru-RU")} ₽
                        {p.inStock ? "" : " (нет)"}
                      </span>
                    ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Форма добавления товара ── */}
      {activePanel === "addProduct" && (
        <CreateProductForm
          categories={categories}
          onCreated={(product) => {
            showNotification(`✅ Товар «${product.title}» добавлен!`);
            setActivePanel("products");
          }}
        />
      )}

      {/* ── Форма добавления категории ── */}
      {activePanel === "addCategory" && (
        <CreateCategoryForm
          onCreated={(cat) => {
            showNotification(`✅ Категория «${cat.name}» добавлена!`);
            setActivePanel("categories");
          }}
        />
      )}

      {/* Модалка деталей товара */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
