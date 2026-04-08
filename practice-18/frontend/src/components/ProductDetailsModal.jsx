export default function ProductDetailsModal({ open, product, loading, onClose }) {
  if (!open) return null;

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div className="modal modal--details" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">Детальная информация о товаре</div>
          <button className="iconBtn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="detailsContent">
          {loading ? (
            <div className="empty">Загрузка товара...</div>
          ) : product ? (
            <>
              <div className="detailRow">
                <span className="detailLabel">ID</span>
                <span className="detailValue">{product.id}</span>
              </div>
              <div className="detailRow">
                <span className="detailLabel">Название</span>
                <span className="detailValue">{product.title}</span>
              </div>
              <div className="detailRow">
                <span className="detailLabel">Категория</span>
                <span className="detailValue">{product.category}</span>
              </div>
              <div className="detailRow">
                <span className="detailLabel">Описание</span>
                <span className="detailValue">{product.description || "-"}</span>
              </div>
              <div className="detailRow">
                <span className="detailLabel">Цена</span>
                <span className="detailValue">
                  {Number(product.price).toLocaleString("ru-RU")} ₽
                </span>
              </div>
            </>
          ) : (
            <div className="empty">Товар не найден.</div>
          )}
        </div>
      </div>
    </div>
  );
}
