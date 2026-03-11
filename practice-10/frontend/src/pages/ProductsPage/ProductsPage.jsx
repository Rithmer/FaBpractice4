import { useEffect, useReducer } from "react";
import "./ProductsPage.scss";
import ProductsList from "../../components/ProductsList";
import ProductModal from "../../components/ProductModal";
import { api } from "../../api";

const initialState = {
  products: [],
  loading: true,
  search: "",
  filterCat: "Все",
  modalOpen: false,
  modalMode: "create",
  editingProduct: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_PRODUCTS":
      return { ...state, products: action.payload, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_SEARCH":
      return { ...state, search: action.payload };
    case "SET_FILTER":
      return { ...state, filterCat: action.payload };
    case "OPEN_CREATE":
      return { ...state, modalOpen: true, modalMode: "create", editingProduct: null };
    case "OPEN_EDIT":
      return { ...state, modalOpen: true, modalMode: "edit", editingProduct: action.payload };
    case "CLOSE_MODAL":
      return { ...state, modalOpen: false, editingProduct: null };
    case "ADD_PRODUCT":
      return { ...state, products: [...state.products, action.payload] };
    case "UPDATE_PRODUCT":
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case "DELETE_PRODUCT":
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.payload),
      };
    default:
      return state;
  }
}

export default function ProductsPage({ user, onLogout }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { products, loading, search, filterCat, modalOpen, modalMode, editingProduct } = state;

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const data = await api.getProducts();
      dispatch({ type: "SET_PRODUCTS", payload: data });
    } catch (err) {
      console.error(err);
      alert("Ошибка загрузки товаров");
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить товар?")) return;
    try {
      await api.deleteProduct(id);
      dispatch({ type: "DELETE_PRODUCT", payload: id });
    } catch (err) {
      console.error(err);
      alert("Ошибка удаления");
    }
  };

  const handleSubmitModal = async (payload) => {
    try {
      if (modalMode === "create") {
        const newProduct = await api.createProduct(payload);
        dispatch({ type: "ADD_PRODUCT", payload: newProduct });
      } else {
        const updated = await api.updateProduct(payload.id, payload);
        dispatch({ type: "UPDATE_PRODUCT", payload: updated });
      }
      dispatch({ type: "CLOSE_MODAL" });
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
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="page">
      <header className="header">
        <div className="header__inner">
          <div className="brand">ТехМаркет</div>
          <div className="header__right">
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
          <div className="toolbar">
            <h1 className="title">Каталог товаров</h1>
            <button
              className="btn btn--primary"
              onClick={() => dispatch({ type: "OPEN_CREATE" })}
            >
              + Добавить товар
            </button>
          </div>

          <div className="filters">
            <input
              className="searchInput"
              value={search}
              onChange={(e) =>
                dispatch({ type: "SET_SEARCH", payload: e.target.value })
              }
              placeholder="Поиск по названию или описанию..."
            />
            <div className="catTabs">
              {categories.map((c) => (
                <button
                  key={c}
                  className={`catTab ${filterCat === c ? "catTab--active" : ""}`}
                  onClick={() => dispatch({ type: "SET_FILTER", payload: c })}
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
              onEdit={(p) => dispatch({ type: "OPEN_EDIT", payload: p })}
              onDelete={handleDelete}
            />
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
        categories={categories.filter((c) => c !== "Все")}
        onClose={() => dispatch({ type: "CLOSE_MODAL" })}
        onSubmit={handleSubmitModal}
      />
    </div>
  );
}
