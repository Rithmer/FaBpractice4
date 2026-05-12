import { useEffect, useState } from "react";
import { api } from "../api";

const ROLE_OPTIONS = ["user", "seller", "admin"];

const EMPTY_FORM = {
  email: "",
  first_name: "",
  last_name: "",
  role: "user",
};

export default function UsersManagement({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error || "Не удалось загрузить пользователей",
      );
    } finally {
      setLoading(false);
    }
  };

  const startEdit = async (id) => {
    try {
      setError("");
      const user = await api.getUserById(id);
      setEditingUserId(id);
      setForm({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Не удалось получить пользователя");
    }
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setForm(EMPTY_FORM);
  };

  const saveEdit = async () => {
    if (!editingUserId) return;

    try {
      setError("");
      const updated = await api.updateUser(editingUserId, {
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role,
      });

      setUsers((prev) =>
        prev.map((user) => (user.id === editingUserId ? updated : user)),
      );
      cancelEdit();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Не удалось обновить пользователя");
    }
  };

  const blockUser = async (id) => {
    if (!window.confirm("Заблокировать пользователя?")) return;

    try {
      setError("");
      const response = await api.blockUser(id);
      const updatedUser = response.user;

      setUsers((prev) =>
        prev.map((user) => (user.id === id ? updatedUser : user)),
      );

      if (editingUserId === id) {
        cancelEdit();
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error || "Не удалось заблокировать пользователя",
      );
    }
  };

  const handleFieldChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <section className="usersSection">
      <div className="usersHeader">
        <h2 className="title usersTitle">Управление пользователями</h2>
        <button className="btn" onClick={loadUsers}>
          Обновить
        </button>
      </div>

      {error ? <div className="usersError">{error}</div> : null}

      {loading ? (
        <div className="empty">Загрузка пользователей...</div>
      ) : (
        <div className="usersTableWrap">
          <table className="usersTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Имя</th>
                <th>Фамилия</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => {
                const isEditing = editingUserId === item.id;
                const isSelf = item.id === currentUserId;
                const isBlocked = item.is_blocked;

                return (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>
                      {isEditing ? (
                        <input
                          className="tableInput"
                          value={form.email}
                          onChange={handleFieldChange("email")}
                        />
                      ) : (
                        item.email
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="tableInput"
                          value={form.first_name}
                          onChange={handleFieldChange("first_name")}
                        />
                      ) : (
                        item.first_name
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="tableInput"
                          value={form.last_name}
                          onChange={handleFieldChange("last_name")}
                        />
                      ) : (
                        item.last_name
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="tableInput"
                          value={form.role}
                          onChange={handleFieldChange("role")}
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`roleBadge roleBadge--${item.role}`}>
                          {item.role}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={
                          isBlocked ? "status status--blocked" : "status"
                        }
                      >
                        {isBlocked ? "Заблокирован" : "Активен"}
                      </span>
                    </td>
                    <td>
                      <div className="tableActions">
                        {isEditing ? (
                          <>
                            <button
                              className="btn btn--sm btn--primary"
                              onClick={saveEdit}
                            >
                              Сохранить
                            </button>
                            <button
                              className="btn btn--sm"
                              onClick={cancelEdit}
                            >
                              Отмена
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn btn--sm"
                              onClick={() => startEdit(item.id)}
                            >
                              Редактировать
                            </button>
                            <button
                              className="btn btn--sm btn--danger"
                              onClick={() => blockUser(item.id)}
                              disabled={isBlocked || isSelf}
                            >
                              Заблокировать
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
