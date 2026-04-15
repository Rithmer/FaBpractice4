import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://localhost:3000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

function clearAuthStorage() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};

    if (!error.response) {
      return Promise.reject(error);
    }

    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    const isRefreshRequest = String(originalRequest.url || "").includes(
      "/auth/refresh"
    );

    if (
      error.response.status === 401 &&
      !originalRequest._retry &&
      !isRefreshRequest
    ) {
      originalRequest._retry = true;

      if (!accessToken || !refreshToken) {
        clearAuthStorage();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = response.data.accessToken;
        const newRefreshToken = response.data.refreshToken;

        localStorage.setItem("accessToken", newAccessToken);
        localStorage.setItem("refreshToken", newRefreshToken);

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };

        return apiClient(originalRequest);
      } catch (refreshError) {
        clearAuthStorage();
        return Promise.reject(refreshError);
      }
    }

    if (error.response.status === 403) {
      const message = String(error.response.data?.error || "").toLowerCase();
      if (message.includes("blocked") || message.includes("заблокирован")) {
        clearAuthStorage();
      }
    }

    return Promise.reject(error);
  }
);

export const api = {
  register: (data) => apiClient.post("/auth/register", data),
  login: (data) => apiClient.post("/auth/login", data),
  getMe: () => apiClient.get("/auth/me"),

  getProducts: async () => (await apiClient.get("/products")).data,
  getProductById: async (id) => (await apiClient.get(`/products/${id}`)).data,
  createProduct: async (product) =>
    (await apiClient.post("/products", product)).data,
  updateProduct: async (id, product) =>
    (await apiClient.put(`/products/${id}`, product)).data,
  deleteProduct: async (id) => apiClient.delete(`/products/${id}`),

  getUsers: async () => (await apiClient.get("/users")).data,
  getUserById: async (id) => (await apiClient.get(`/users/${id}`)).data,
  updateUser: async (id, user) => (await apiClient.put(`/users/${id}`, user)).data,
  blockUser: async (id) => (await apiClient.delete(`/users/${id}`)).data,

  getPushPublicKey: async () => (await apiClient.get("/push/public-key")).data,
  subscribePush: async (subscription) =>
    (await apiClient.post("/push/subscribe", subscription)).data,
  unsubscribePush: async (endpoint) =>
    (await apiClient.post("/push/unsubscribe", { endpoint })).data,
  createDeliveryReminder: async (payload) =>
    (await apiClient.post("/reminders", payload)).data,
  getReminders: async () => (await apiClient.get("/reminders")).data,
  dismissReminder: async (reminderId) =>
    (await apiClient.post(`/reminders/dismiss?reminderId=${reminderId}`)).data,
};
