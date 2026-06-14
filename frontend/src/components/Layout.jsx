import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Icon } from "./Icons";

const ADMIN_NAV = [
  { to: "/", label: "Gösterge Paneli", icon: "dashboard", end: true, perm: "dashboard" },
  {
    label: "Affiliate",
    icon: "affiliate",
    perm: "affiliates",
    children: [
      { to: "/affiliates", label: "Affiliate Listesi", perm: "affiliates" },
      { to: "/groups", label: "Affiliate Grupları", perm: "affiliate_groups" },
    ],
  },
  { to: "/reports", label: "Raporlar", icon: "reports", perm: "reports" },
  { to: "/players", label: "Oyuncular", icon: "players", perm: "players" },
  { to: "/withdrawals", label: "Çekim İstekleri", icon: "withdraw", perm: "withdrawals" },
  { to: "/messages", label: "Mesajlar", icon: "message", perm: "messages" },
  { to: "/activities", label: "Aktiviteler", icon: "activity", perm: "activities" },
  {
    label: "Kullanıcılar",
    icon: "users",
    perm: "users",
    children: [
      { to: "/users", label: "Kullanıcı Listesi", perm: "users" },
      { to: "/permissions", label: "Yetkilendirme", perm: "permissions" },
    ],
  },
  { to: "/merchants", label: "Merchant Bilgileri", icon: "settings", perm: "merchants" },
  { to: "/settings", label: "Sistem Ayarları", icon: "settings", perm: "settings" },
];

const AFFILIATE_NAV = [
  { to: "/", label: "Gösterge Paneli", icon: "dashboard", end: true },
  { to: "/my-links", label: "Referans Linklerim", icon: "link" },
  { to: "/affiliates", label: "Alt Affiliatelerim", icon: "group" },
  { to: "/players", label: "Oyuncularım", icon: "players" },
  { to: "/withdrawals", label: "Çekim İstekleri", icon: "withdraw" },
  { to: "/messages", label: "Canlı Destek", icon: "message" },
];

function NavGroup({ item }) {
  const location = useLocation();
  const childActive = item.children?.some((c) => location.pathname === c.to);
  const [open, setOpen] = useState(childActive);
  const Ico = Icon[item.icon];

  if (!item.children) {
    return (
      <NavLink to={item.to} end={item.end} className="nav-item">
        {Ico && <Ico className="ico" />}
        <span>{item.label}</span>
      </NavLink>
    );
  }
  return (
    <div>
      <button
        className="nav-item"
        style={{ width: "100%", border: "none", background: "transparent" }}
        onClick={() => setOpen((o) => !o)}
      >
        {Ico && <Ico className="ico" />}
        <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
        <Icon.chevron
          width={15}
          height={15}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}
        />
      </button>
      {open && (
        <div className="nav-sub">
          {item.children.map((c) => (
            <NavLink key={c.to} to={c.to} className="nav-item">
              <span>{c.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout({ title, children }) {
  const { user, branding, logout, isAdmin, can, impersonating, stopImpersonate } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function filterNav(items) {
    return items
      .map((item) => {
        if (item.children) {
          const children = item.children.filter((c) => !c.perm || can(c.perm, "view"));
          if (!children.length && item.perm && !can(item.perm, "view")) return null;
          if (!children.length) return null;
          return { ...item, children };
        }
        if (item.perm && !can(item.perm, "view")) return null;
        return item;
      })
      .filter(Boolean);
  }

  const nav = isAdmin ? filterNav(ADMIN_NAV) : AFFILIATE_NAV;
  const initials = (user?.name || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">PQ</div>
          <div>
            <div className="brand-text">{branding.brand_name || "Affiliate Panel"}</div>
            <div className="brand-sub">AFFILIATE</div>
          </div>
        </div>
        <nav className="nav">
          <div className="nav-group-title">{isAdmin ? "Yönetim" : "Panelim"}</div>
          {nav.map((item, i) => (
            <NavGroup key={i} item={item} />
          ))}
        </nav>
        <div className="sidebar-footer">
          {branding.site_name} · {isAdmin ? "Yönetici" : "Affiliate"}
        </div>
      </aside>

      <div className="main">
        {impersonating && (
          <div className="imp-banner">
            <span>
              👁️ Affiliate panelini görüntülüyorsunuz: <strong>{impersonating}</strong>
            </span>
            <button onClick={stopImpersonate}>Yönetici paneline dön</button>
          </div>
        )}
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              className="btn btn-ghost btn-icon hamburger"
              onClick={() => setSidebarOpen((o) => !o)}
            >
              <Icon.menu />
            </button>
            <div className="topbar-title">{title}</div>
          </div>
          <div className="topbar-right">
            <div className="site-pill">
              <Icon.shield width={15} height={15} />
              {branding.site_name}
            </div>
            <div className="search-box">
              <Icon.search width={16} height={16} />
              <input placeholder="Arama" />
            </div>
            <div className="user-menu">
              <div className="avatar" onClick={() => setMenuOpen((o) => !o)}>
                {initials}
              </div>
              {menuOpen && (
                <div className="user-dropdown">
                  <div className="u-name">{user?.name}</div>
                  <div className="u-mail">{user?.email}</div>
                  <button onClick={logout}>Çıkış Yap</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
