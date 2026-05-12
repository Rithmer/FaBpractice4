// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "./apollo/client";
import { api } from "./api";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage/RegisterPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage/ProductsPage"));

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      api
        .getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData, accessToken, refreshToken) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    // ApolloProvider оборачивает всё приложение, чтобы useQuery/useMutation
    // были доступны в любом компоненте внутри дерева
    <ApolloProvider client={apolloClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="loading">Загрузка...</div>}>
          <Routes>
            <Route
              path="/login"
              element={
                user ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />
              }
            />
            <Route
              path="/register"
              element={
                user ? <Navigate to="/" /> : <RegisterPage onLogin={handleLogin} />
              }
            />
            <Route
              path="/"
              element={
                user ? (
                  <ProductsPage user={user} onLogout={handleLogout} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ApolloProvider>
  );
}

export default App;
