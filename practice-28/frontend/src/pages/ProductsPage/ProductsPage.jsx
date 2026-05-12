import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import "./ProductsPage.scss";
import ProductsList from "../../components/ProductsList";
import ProductModal from "../../components/ProductModal";
import ProductDetailsModal from "../../components/ProductDetailsModal";
import UsersManagement from "../../components/UsersManagement";
import Cart from "../../components/Cart";
import OrdersHistory from "../../components/OrdersHistory";
import { api } from "../../api";

const BooksPage = lazy(() => import("../BooksPage/BooksPage"));

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
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [reminderProductTitle, setReminderProductTitle] = useState("");
  const [realtimeEvents, setRealtimeEvents] = useState([]);
  const [trackedReminders, setTrackedReminders] = useState([]);
  const [browserReminder, setBrowserReminder] = useState(null);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);

  const isAdmin = user.role === "admin";
  const canCreateOrEditProduct = user.role === "seller" || user.role === "admin";
  const canDeleteProduct = user.role === "admin";

  const saveCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === product.id);
      const next = exists
        ? prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { id: product.id, title: product.title, price: product.price, quantity: 1 }];
      localStorage.setItem("cart", JSON.stringify(next));
      return next;
    });
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const enablePushNotifications = async () => {
    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") setIsPushEnabled(true);
      else alert("Push-уведомления не разрешены браузером");
    } catch (err) { console.error(err); }
    finally { setPushLoading(false); }
  };

  const disablePushNotifications = () => setIsPushEnabled(false);

  const handleCreateDeliveryReminder = (e) => {
    e.preventDefault();
    if (!reminderProductTitle.trim()) return;
    setTrackedReminders((prev) => [...prev, { id: Date.now(), productTitle: reminderProductTitle.trim() }]);
    setReminderProductTitle("");
  };

  const handleDismissTrackedReminder = (id) =>
    setTrackedReminders((prev) => prev.filter((r) => r.id !== id));
  const handleDismissBrowserReminder = () => setBrowserReminder(null);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setProducts(await api.getProducts());
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Ошибка загрузки товаров");
    } finally { setLoading(false); }
  };

  const openCreateModal = () => {
    if (!canCreateOrEditProduct) return;
    setModalMode("create"); setEditingProduct(null); setModalOpen(true);
  };
  const openEditModal = (product) => {
    if (!canCreateOrEditProduct) return;
    setModalMode("edit"); setEditingProduct(product); setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditingProduct(null); };

  const handleDelete = async (id) => {
    if (!canDeleteProduct || !window.confirm("Удалить товар?")) return;
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((item) => item.id !== id));
    } catch (err) { alert(err.response?.data?.error || "Ошибка удаления"); }
  };

  const handleSubmitModal = async (payload) => {
    if (!canCreateOrEditProduct) return;
    try {
      if (modalMode === "create") {
        const created = await api.createProduct(payload);
        setProducts((prev) => [...prev, created]);
      } else {
        const updated = await api.updateProduct(payload.id, payload);
        setProducts((prev) => prev.map((item) => item.id === updated.id ? updated : item));
      }
      closeModal();
    } catch (err) { alert(err.response?.data?.error || "Ошибка сохранения товара"); }
  };

  const openDetails = async (id) => {
    setDetailsOpen(true); setDetailsLoading(true); setDetailsProduct(null);
    try {
      setDetailsProduct(await api.getProductById(id));
    } catch (err) { alert(err.response?.data?.error || "Не удалось загрузить товар"); }
    finally { setDetailsLoading(false); }
  };

  const categories = useMemo(
    () => ["Все", ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  );

  const filteredProducts = useMemo(
    () => products.filter((item) => {
      const text = search.trim().toLowerCase();
      return (filterCat === "Все" || item.category === filterCat) &&
        (item.title.toLowerCase().includes(text) || item.description.toLowerCase().includes(text));
    }),
    [products, search, filterCat]
  );

  return (
    <div className="page">
      <header className="header">
        <div className="header__inner">
          <div className="brand">ТехМаркет</div>
          <div className="header__right">
            <span className="roleChip">Роль: {user.role}</span>
            <span className="userInfo">{user.first_name} {user.last_name}</span>
            <button className="btn btn--sm cart-btn" onClick={() => setCartOpen(true)}>
              🛒 {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
            <button className="btn btn--sm" onClick={onLogout}>Выйти</button>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <div className="sectionTabs">
            <button
              className={`sectionTab ${activeTab === "products" ? "sectionTab--active" : ""}`}
              onClick={() => setActiveTab("products")}
            >
              Товары
            </button>
            <button
              className={`sectionTab ${activeTab === "orders" ? "sectionTab--active" : ""}`}
              onClick={() => setActiveTab("orders")}
            >
              Мои заказы
            </button>
            <button
              className={`sectionTab ${activeTab === "books" ? "sectionTab--active" : ""}`}
              onClick={() => setActiveTab("books")}
            >
              ✨ Расширенный каталог
              <span className="sectionTab__gql">Новинки</span>
            </button>
            {isAdmin && (
              <button
                className={`sectionTab ${activeTab === "users" ? "sectionTab--active" : ""}`}
                onClick={() => setActiveTab("users")}
              >
                Пользователи
              </button>
            )}
          </div>

          {activeTab === "products" && (
            <>
              <div className="toolbar">
                <h1 className="title">Каталог Apple</h1>
                {canCreateOrEditProduct ? (
                  <button className="btn btn--primary" onClick={openCreateModal}>+ Добавить товар</button>
                ) : (
                  <span className="permissionHint">Роль user может только просматривать товары</span>
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
                      className={`catTab ${filterCat === category ? "catTab--active" : ""}`}
                      onClick={() => setFilterCat(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="stats">
                Показано: <strong>{filteredProducts.length}</strong> из <strong>{products.length}</strong> товаров
              </div>

              <section className="reminderPanel">
                <div className="reminderPanel__header">
                  <h2>Уведомления о появлении товара</h2>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={isPushEnabled ? disablePushNotifications : enablePushNotifications}
                    disabled={pushLoading}
                  >
                    {pushLoading ? "Подключение..." : isPushEnabled ? "Выключить push" : "Включить push"}
                  </button>
                </div>
                <form className="reminderForm" onSubmit={handleCreateDeliveryReminder}>
                  <input
                    className="input"
                    value={reminderProductTitle}
                    onChange={(e) => setReminderProductTitle(e.target.value)}
                    placeholder="Например: Iphone17 или iPhone 17"
                    maxLength={120}
                    required
                  />
                  <button type="submit" className="btn">Отслеживать</button>
                </form>
                {realtimeEvents.length > 0 && (
                  <ul className="realtimeEvents">
                    {realtimeEvents.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
                {trackedReminders.length > 0 && (
                  <ul className="realtimeEvents">
                    {trackedReminders.map((item) => (
                      <li key={item.id}>
                        Отслеживается: {item.productTitle}{" "}
                        <button type="button" className="btn btn--sm" onClick={() => handleDismissTrackedReminder(item.id)}>Удалить</button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {browserReminder && (
                <section className="reminderPanel">
                  <div className="reminderPanel__header">
                    <h2>Товар найден</h2>
                    <button type="button" className="btn btn--primary" onClick={handleDismissBrowserReminder}>ОК</button>
                  </div>
                  <p>В каталоге появился товар: <strong>{browserReminder.productTitle}</strong></p>
                </section>
              )}

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
                  onAddToCart={addToCart}
                />
              )}
            </>
          )}

          {activeTab === "orders" && <OrdersHistory />}

          {activeTab === "books" && (
            <Suspense fallback={<div className="empty">Загрузка...</div>}>
              <BooksPage />
            </Suspense>
          )}

          {activeTab === "users" && isAdmin && <UsersManagement currentUserId={user.id} />}
        </div>
      </main>

      <footer className="footer">
        <div className="footer__inner">© {new Date().getFullYear()} ТехМаркет</div>
      </footer>

      <ProductModal
        key={editingProduct ? editingProduct.id : "new-product"}
        open={modalOpen}
        mode={modalMode}
        initialProduct={editingProduct}
        categories={categories.filter((c) => c !== "Все")}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />

      <ProductDetailsModal
        open={detailsOpen}
        product={detailsProduct}
        loading={detailsLoading}
        onClose={() => setDetailsOpen(false)}
      />

      {cartOpen && (
        <Cart
          cart={cart}
          onUpdate={saveCart}
          onClose={() => setCartOpen(false)}
        />
      )}
    </div>
  );
}
