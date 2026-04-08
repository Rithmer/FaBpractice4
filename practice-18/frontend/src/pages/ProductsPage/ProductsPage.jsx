import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./ProductsPage.scss";
import ProductsList from "../../components/ProductsList";
import ProductModal from "../../components/ProductModal";
import ProductDetailsModal from "../../components/ProductDetailsModal";
import UsersManagement from "../../components/UsersManagement";
import { api } from "../../api";

export default function ProductsPage({ user, onLogout }) {
  if (!user) {
    return null;
  }

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
  const [reminderProductTitle, setReminderProductTitle] = useState("");
  const [pushLoading, setPushLoading] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [realtimeEvents, setRealtimeEvents] = useState([]);
  const [browserReminder, setBrowserReminder] = useState(null);
  const [trackedReminders, setTrackedReminders] = useState([]);
  const socketRef = useRef(null);

  const userId = user.id;
  const isAdmin = user.role === "admin";
  const canCreateOrEditProduct = user.role === "seller" || user.role === "admin";
  const canDeleteProduct = user.role === "admin";

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncReminders = async () => {
      try {
        const data = await api.getReminders();
        if (isMounted) {
          setTrackedReminders(data.reminders || []);
        }
      } catch (error) {
        console.error("Load reminders failed:", error);
      }
    };

    const handleVisibilitySync = () => {
      if (document.visibilityState === "visible") {
        syncReminders();
      }
    };

    syncReminders();
    document.addEventListener("visibilitychange", handleVisibilitySync);
    window.addEventListener("focus", syncReminders);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilitySync);
      window.removeEventListener("focus", syncReminders);
    };
  }, [userId]);

  useEffect(() => {
    const socket = io("http://localhost:3000");
    socketRef.current = socket;

    const emitVisibility = () => {
      socket.emit("userVisibility", {
        userId,
        visible: document.visibilityState === "visible",
      });
    };

    socket.on("connect", () => {
      emitVisibility();
      api.getReminders()
        .then((data) => setTrackedReminders(data.reminders || []))
        .catch(() => {});
    });
    document.addEventListener("visibilitychange", emitVisibility);

    socket.on("availabilityAlertTriggered", (payload) => {
      if (!payload?.productTitle || payload.userId !== userId) return;
      setTrackedReminders((prev) =>
        prev.filter((item) => item.id !== payload.reminderId)
      );
      setRealtimeEvents((prev) => [
        `Товар появился: ${payload.productTitle}`,
        ...prev,
      ].slice(0, 4));
      if (document.visibilityState === "visible") {
        setBrowserReminder({
          reminderId: payload.reminderId,
          productTitle: payload.productTitle,
        });
      }
    });

    socket.on("availabilityAlertDismissed", (payload) => {
      if (!payload?.reminderId) return;
      setTrackedReminders((prev) =>
        prev.filter((item) => item.id !== payload.reminderId)
      );
      setBrowserReminder((prev) =>
        prev?.reminderId === payload.reminderId ? null : prev
      );
    });

    return () => {
      document.removeEventListener("visibilitychange", emitVisibility);
      socket.disconnect();
    };
  }, [userId]);

  useEffect(() => {
    const syncPushState = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          try {
            await api.subscribePush(subscription);
          } catch (syncError) {
            console.error("Push subscription sync failed:", syncError);
          }
        }
        setIsPushEnabled(Boolean(subscription));
      } catch (error) {
        console.error("Push state sync failed:", error);
      }
    };
    syncPushState();
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
          prev.map((item) => (item.id === updated.id ? updated : item))
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
    [products]
  );

  const filteredProducts = useMemo(
    () =>
      products.filter((item) => {
        const text = search.trim().toLowerCase();
        const matchCategory = filterCat === "Все" || item.category === filterCat;
        const matchText =
          item.title.toLowerCase().includes(text) ||
          item.description.toLowerCase().includes(text);
        return matchCategory && matchText;
      }),
    [products, search, filterCat]
  );

  const urlBase64ToUint8Array = (base64String) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const enablePushNotifications = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Push-уведомления не поддерживаются в этом браузере");
      return;
    }

    try {
      setPushLoading(true);
      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          alert("Разрешите уведомления, чтобы включить push");
          return;
        }
      }

      if (Notification.permission !== "granted") {
        alert("Уведомления запрещены в браузере");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const { publicKey } = await api.getPushPublicKey();
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

      await api.subscribePush(subscription);
      setIsPushEnabled(true);
      alert("Push-уведомления включены");
    } catch (error) {
      console.error(error);
      alert("Не удалось включить push");
    } finally {
      setPushLoading(false);
    }
  };

  const disablePushNotifications = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }
    try {
      setPushLoading(true);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setIsPushEnabled(false);
        return;
      }
      await api.unsubscribePush(subscription.endpoint);
      await subscription.unsubscribe();
      setIsPushEnabled(false);
      alert("Push-уведомления отключены");
    } catch (error) {
      console.error(error);
      alert("Не удалось отключить push");
    } finally {
      setPushLoading(false);
    }
  };

  const handleCreateDeliveryReminder = async (event) => {
    event.preventDefault();
    const productTitle = reminderProductTitle.trim();
    if (!productTitle) {
      return;
    }

    try {
      const created = await api.createDeliveryReminder({ productTitle });
      setTrackedReminders((prev) => [
        ...prev,
        { id: created.id, productTitle: created.productTitle, createdAt: Date.now() },
      ]);
      socketRef.current?.emit("deliveryReminderCreated", { productTitle, userId });
      setReminderProductTitle("");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Не удалось создать напоминание");
    }
  };

  const handleDismissBrowserReminder = async () => {
    if (!browserReminder?.reminderId) {
      setBrowserReminder(null);
      return;
    }
    try {
      await api.dismissReminder(browserReminder.reminderId);
    } catch (error) {
      console.error("Reminder dismiss failed:", error);
    } finally {
      setBrowserReminder(null);
    }
  };

  const handleDismissTrackedReminder = async (reminderId) => {
    try {
      await api.dismissReminder(reminderId);
      setTrackedReminders((prev) => prev.filter((item) => item.id !== reminderId));
    } catch (error) {
      console.error("Dismiss tracked reminder failed:", error);
    }
  };

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
                  <button className="btn btn--primary" onClick={openCreateModal}>
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

              <section className="reminderPanel">
                <div className="reminderPanel__header">
                  <h2>Уведомления о появлении товара</h2>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={isPushEnabled ? disablePushNotifications : enablePushNotifications}
                    disabled={pushLoading}
                  >
                    {pushLoading
                      ? "Подключение..."
                      : isPushEnabled
                        ? "Выключить push"
                        : "Включить push"}
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
                  <button type="submit" className="btn">
                    Отслеживать
                  </button>
                </form>

                {realtimeEvents.length > 0 ? (
                  <ul className="realtimeEvents">
                    {realtimeEvents.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}

                {trackedReminders.length > 0 ? (
                  <ul className="realtimeEvents">
                    {trackedReminders.map((item) => (
                      <li key={item.id}>
                        Отслеживается: {item.productTitle}{" "}
                        <button
                          type="button"
                          className="btn btn--sm"
                          onClick={() => handleDismissTrackedReminder(item.id)}
                        >
                          Удалить
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              {browserReminder ? (
                <section className="reminderPanel">
                  <div className="reminderPanel__header">
                    <h2>Товар найден</h2>
                    <button type="button" className="btn btn--primary" onClick={handleDismissBrowserReminder}>
                      ОК
                    </button>
                  </div>
                  <p>
                    В каталоге появился товар: <strong>{browserReminder.productTitle}</strong>
                  </p>
                </section>
              ) : null}

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
        <div className="footer__inner">© {new Date().getFullYear()} ТехМаркет</div>
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