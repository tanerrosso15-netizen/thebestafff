import axios from "axios";

const baseURL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") || "";

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pqp_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem("pqp_token");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export function apiError(err, fallback = "Bir hata oluştu.") {
  return err?.response?.data?.detail || err?.message || fallback;
}
