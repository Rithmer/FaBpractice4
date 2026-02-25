import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: { "Content-Type": "application/json" },
});

export const api = {
  getProducts: async () =>
    (await apiClient.get("/products")).data,

  getProductById: async (id) =>
    (await apiClient.get(`/products/${id}`)).data,

  createProduct: async (product) =>
    (await apiClient.post("/products", product)).data,

  updateProduct: async (id, product) =>
    (await apiClient.patch(`/products/${id}`, product)).data,

  deleteProduct: async (id) =>
    apiClient.delete(`/products/${id}`),
};