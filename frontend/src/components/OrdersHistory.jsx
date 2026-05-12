import { useEffect, useState } from "react";
import { api } from "../api";
import "./OrdersHistory.scss";

export default function OrdersHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="orders-status">Загрузка заказов...</div>;
  if (orders.length === 0) return <div className="orders-status">У вас пока нет заказов</div>;

  return (
    <div className="orders">
      <h2 className="orders__title">История заказов</h2>
      <ul className="orders__list">
        {orders.map((order) => (
          <li key={order.id} className="order-card">
            <div className="order-card__header">
              <span className="order-card__id">#{order.id}</span>
              <span className={`order-card__status order-card__status--${order.status}`}>
                {order.status === "paid" ? "Оплачен" : order.status}
              </span>
              <span className="order-card__date">
                {new Date(order.created_at).toLocaleDateString("ru-RU")}
              </span>
            </div>
            <ul className="order-card__items">
              {order.items.map((item, i) => (
                <li key={i} className="order-card__item">
                  <span>{item.title}</span>
                  <span>{item.quantity} × {item.price.toLocaleString("ru-RU")} ₽</span>
                </li>
              ))}
            </ul>
            <div className="order-card__total">
              Итого: <strong>{Number(order.total).toLocaleString("ru-RU")} ₽</strong>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
