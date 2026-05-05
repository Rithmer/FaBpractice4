import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import "./RegisterPage.scss";

export default function RegisterPage({ onLogin }) {
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
  });
  const [error, setError] = useState("");

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.register(form);
      const loginRes = await api.login({
        email: form.email,
        password: form.password,
      });
      const { accessToken, refreshToken } = loginRes.data;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      const meRes = await api.getMe();
      onLogin(meRes.data, accessToken, refreshToken);
    } catch (err) {
      setError(err.response?.data?.error || "Ошибка регистрации");
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Регистрация</h1>
        {error && <div className="auth-error">{error}</div>}
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            required
          />
        </label>
        <label>
          Имя
          <input
            value={form.first_name}
            onChange={set("first_name")}
            required
          />
        </label>
        <label>
          Фамилия
          <input value={form.last_name} onChange={set("last_name")} required />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={form.password}
            onChange={set("password")}
            required
          />
        </label>
        <button type="submit" className="btn btn--primary">
          Зарегистрироваться
        </button>
        <p className="auth-link">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  );
}
