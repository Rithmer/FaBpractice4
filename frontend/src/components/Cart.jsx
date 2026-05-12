import { useState } from "react";
import { api } from "../api";
import "./Cart.scss";

export default function Cart({ cart, onUpdate, onClose }) {
  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const changeQty = (id, delta) => {
    onUpdate(cart.map((item) =>
      item.id === id
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ).filter((item) => item.quantity > 0));
  };

  const remove = (id) => onUpdate(cart.filter((item) => item.id !== id));

  const checkout = async () => {
    setLoading(true);
    try {
      const items = cart.map((item) => ({ productId: item.id, quantity: item.quantity }));
      const order = await api.createOrder(items);
      setOrderResult(order);
      onUpdate([]);
    } catch (err) {
      alert(err.response?.data?.error || "Ошибка оформления заказа");
    } finally {
      setLoading(false);
    }
  };

  if (orderResult) {
    return (
      <div className="cart-overlay" onClick={onClose}>
        <div className="cart" onClick={(e) => e.stopPropagation()}>
          <div className="cart__success">
            <div className="cart__success-icon">✅</div>
            <h3>Заказ оформлен!</h3>
            <p>Номер заказа: <strong>{orderResult.id}</strong></p>
            <p>Сумма: <strong>{orderResult.total.toLocaleString("ru-RU")} ₽</strong></p>
            <button className="cart__btn cart__btn--primary" onClick={onClose}>Закрыть</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-overlay" onClick={onClose}>
      <div className="cart" onClick={(e) => e.stopPropagation()}>
        <div className="cart__header">
          <h3>Корзина</h3>
          <button className="cart__close" onClick={onClose}>✕</button>
        </div>

        {cart.length === 0 ? (
          <div className="cart__empty">Корзина пуста</div>
        ) : (
          <>
            <ul className="cart__list">
              {cart.map((item) => (
                <li key={item.id} className="cart__item">
                  <div className="cart__item-info">
                    <span className="cart__item-title">{item.title}</span>
                    <span className="cart__item-price">{item.price.toLocaleString("ru-RU")} ₽</span>
                  </div>
                  <div className="cart__item-controls">
                    <button onClick={() => changeQty(item.id, -1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => changeQty(item.id, 1)}>+</button>
                    <button className="cart__item-remove" onClick={() => remove(item.id)}>✕</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="cart__footer">
              <div className="cart__total">
                Итого: <strong>{total.toLocaleString("ru-RU")} ₽</strong>
              </div>
              <button className="cart__btn cart__btn--primary" onClick={checkout} disabled={loading}>
                {loading ? "Оформление..." : "Оформить заказ"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
