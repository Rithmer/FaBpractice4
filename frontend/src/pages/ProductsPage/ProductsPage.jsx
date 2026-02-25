import React, { useEffect, useState } from "react";
import "./ProductsPage.scss";
import ProductsList from "../../components/ProductsList";
import ProductModal from "../../components/ProductModal";
import { api } from "../../api";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Все");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
      alert("Ошибка загрузки товаров");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setModalMode("create");
    setEditingProduct(null);
    setModalOpen(true);
  };
  const openEdit = (p) => {
    setModalMode("edit");
    setEditingProduct(p);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить товар?")) return;
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      alert("Ошибка удаления");
    }
  };

  const handleSubmitModal = async (payload) => {
    try {
      if (modalMode === "create") {
        const newProduct = await api.createProduct(payload);
        setProducts((prev) => [...prev, newProduct]);
      } else {
        const updated = await api.updateProduct(payload.id, payload);
        setProducts((prev) =>
          prev.map((p) => (p.id === payload.id ? updated : p))
        );
      }
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Ошибка сохранения");
    }
  };

  const categories = [
    "Все",
    ...Array.from(new Set(products.map((p) => p.category))),
  ];

  const filtered = products.filter((p) => {
    const matchCat = filterCat === "Все" || p.category === filterCat;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="page">
      <header className="header">
        <div className="header__inner">
          <div className="brand">ТехМаркет</div>
          <div className="header__right">React + Express</div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <div className="toolbar">
            <h1 className="title">Каталог товаров</h1>
            <button className="btn btn--primary" onClick={openCreate}>
              + Добавить товар
            </button>
          </div>

          <div className="filters">
            <input
              className="searchInput"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию или описанию..."
            />
            <div className="catTabs">
              {categories.map((c) => (
                <button
                  key={c}
                  className={`catTab ${
                    filterCat === c ? "catTab--active" : ""
                  }`}
                  onClick={() => setFilterCat(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="stats">
            Показано: <strong>{filtered.length}</strong> из{" "}
            <strong>{products.length}</strong> товаров
          </div>

          {loading ? (
            <div className="empty">Загрузка каталога...</div>
          ) : (
            <ProductsList
              products={filtered}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          © {new Date().getFullYear()} ТехМаркет — все права защищены
        </div>
      </footer>

      <ProductModal
        key={editingProduct ? editingProduct.id : "new-product"}
        open={modalOpen}
        mode={modalMode}
        initialProduct={editingProduct}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />
    </div>
  );
}
