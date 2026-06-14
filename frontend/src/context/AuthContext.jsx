import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [branding, setBranding] = useState({ brand_name: "PQP", site_name: "CASINOPERA" });
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    const token = localStorage.getItem("pqp_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const [me, brand] = await Promise.all([
        api.get("/api/auth/me"),
        api.get("/api/system/branding").catch(() => ({ data: null })),
      ]);
      setUser(me.data);
      if (brand.data) setBranding(brand.data);
    } catch {
      localStorage.removeItem("pqp_token");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  async function login(email, password) {
    const res = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("pqp_token", res.data.access_token);
    await loadMe();
    return res.data;
  }

  function logout() {
    localStorage.removeItem("pqp_token");
    localStorage.removeItem("pqp_admin_token");
    localStorage.removeItem("pqp_imp");
    setUser(null);
    window.location.href = "/login";
  }

  function impersonate(token, name) {
    const admin = localStorage.getItem("pqp_token");
    if (admin) localStorage.setItem("pqp_admin_token", admin);
    localStorage.setItem("pqp_token", token);
    localStorage.setItem("pqp_imp", name || "Affiliate");
    window.location.href = "/";
  }

  function stopImpersonate() {
    const admin = localStorage.getItem("pqp_admin_token");
    if (admin) localStorage.setItem("pqp_token", admin);
    localStorage.removeItem("pqp_admin_token");
    localStorage.removeItem("pqp_imp");
    window.location.href = "/affiliates";
  }

  const isAdmin = user && (user.role === "admin" || user.role === "manager");
  const impersonating = localStorage.getItem("pqp_imp");

  return (
    <AuthContext.Provider
      value={{ user, branding, loading, login, logout, isAdmin, impersonate, stopImpersonate, impersonating }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
