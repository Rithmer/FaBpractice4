import { useEffect, useMemo, useState } from "react";
import "./ProductsPage.scss";
import ProductsList from "../../components/ProductsList";
import ProductModal from "../../components/ProductModal";
import ProductDetailsModal from "../../components/ProductDetailsModal";
import UsersManagement from "../../components/UsersManagement";
import { api } from "../../api";

export default function ProductsPage({ user, onLogout }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Все");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeTab, setActiveTab] = useState("products");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState(null);

  const isAdmin = user.role === "admin";
  const canCreateOrEditProduct =
    user.role === "seller" || user.role === "admin";
  const canDeleteProduct = user.role === "admin";

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
      alert(err.response?.data?.error || "Ошибка загрузки товаров");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    if (!canCreateOrEditProduct) return;
    setModalMode("create");
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    if (!canCreateOrEditProduct) return;
    setModalMode("edit");
    setEditingProduct(product);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = async (id) => {
    if (!canDeleteProduct) return;
    if (!window.confirm("Удалить товар?")) return;

    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Ошибка удаления");
    }
  };

  const handleSubmitModal = async (payload) => {
    if (!canCreateOrEditProduct) return;

    try {
      if (modalMode === "create") {
        const created = await api.createProduct(payload);
        setProducts((prev) => [...prev, created]);
      } else {
        const updated = await api.updateProduct(payload.id, payload);
        setProducts((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
      }

      closeModal();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Ошибка сохранения товара");
    }
  };

  const openDetails = async (id) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsProduct(null);

    try {
      const fullProduct = await api.getProductById(id);
      setDetailsProduct(fullProduct);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Не удалось загрузить товар");
    } finally {
      setDetailsLoading(false);
    }
  };

  const categories = useMemo(
    () => ["Все", ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );

  const filteredProducts = useMemo(
    () =>
      products.filter((item) => {
        const text = search.trim().toLowerCase();
        const matchCategory =
          filterCat === "Все" || item.category === filterCat;
        const matchText =
          item.title.toLowerCase().includes(text) ||
          item.description.toLowerCase().includes(text);
        return matchCategory && matchText;
      }),
    [products, search, filterCat],
  );

  return (
    <div className="page">
      <header className="header">
        <div className="header__inner">
          <div className="brand">ТехМаркет</div>
          <div className="header__right">
            <span className="roleChip">Роль: {user.role}</span>
            <span className="userInfo">
              {user.first_name} {user.last_name}
            </span>
            <button className="btn btn--sm" onClick={onLogout}>
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          {isAdmin ? (
            <div className="sectionTabs">
              <button
                className={`sectionTab ${
                  activeTab === "products" ? "sectionTab--active" : ""
                }`}
                onClick={() => setActiveTab("products")}
              >
                Товары
              </button>
              <button
                className={`sectionTab ${
                  activeTab === "users" ? "sectionTab--active" : ""
                }`}
                onClick={() => setActiveTab("users")}
              >
                Пользователи
              </button>
            </div>
          ) : null}

          {activeTab === "products" ? (
            <>
              <div className="toolbar">
                <h1 className="title">Каталог Apple</h1>
                {canCreateOrEditProduct ? (
                  <button
                    className="btn btn--primary"
                    onClick={openCreateModal}
                  >
                    + Добавить товар
                  </button>
                ) : (
                  <span className="permissionHint">
                    Роль user может только просматривать товары
                  </span>
                )}
              </div>

              <div className="filters">
                <input
                  className="searchInput"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по названию или описанию..."
                />
                <div className="catTabs">
                  {categories.map((category) => (
                    <button
                      key={category}
                      className={`catTab ${
                        filterCat === category ? "catTab--active" : ""
                      }`}
                      onClick={() => setFilterCat(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="stats">
                Показано: <strong>{filteredProducts.length}</strong> из{" "}
                <strong>{products.length}</strong> товаров
              </div>

              {loading ? (
                <div className="empty">Загрузка каталога...</div>
              ) : (
                <ProductsList
                  products={filteredProducts}
                  onView={openDetails}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  canEdit={canCreateOrEditProduct}
                  canDelete={canDeleteProduct}
                />
              )}
            </>
          ) : (
            <UsersManagement currentUserId={user.id} />
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          © {new Date().getFullYear()} ТехМаркет
        </div>
      </footer>

      <ProductModal
        key={editingProduct ? editingProduct.id : "new-product"}
        open={modalOpen}
        mode={modalMode}
        initialProduct={editingProduct}
        categories={categories.filter((category) => category !== "Все")}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />

      <ProductDetailsModal
        open={detailsOpen}
        product={detailsProduct}
        loading={detailsLoading}
        onClose={() => setDetailsOpen(false)}
      />
    </div>
  );
}
