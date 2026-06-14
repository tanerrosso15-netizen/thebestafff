import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

const DEFAULTS = {
  brand_name: "PQP",
  site_name: "CASINOPERA",
  landing_title: "Affiliate Ortaklık Programı",
  landing_subtitle: "Kazançlarınızı tek panelden yönetin",
  landing_description:
    "Referans linkinizle oyuncu getirin, komisyon kazanın. Gerçek zamanlı raporlar, alt kampanya takibi ve canlı destek.",
  landing_cta: "Panele Giriş Yap",
  landing_highlight: "Gerçek zamanlı komisyon takibi",
  panel_login_url: "/login",
};

export default function Landing() {
  const [cfg, setCfg] = useState(DEFAULTS);

  useEffect(() => {
    api.get("/api/public/landing").then((r) => setCfg({ ...DEFAULTS, ...r.data })).catch(() => {});
  }, []);

  const loginTo = cfg.panel_login_url?.startsWith("http")
    ? cfg.panel_login_url
    : cfg.panel_login_url || "/login";

  return (
    <div className="landing-page">
      <div className="landing-glow landing-glow-1" />
      <div className="landing-glow landing-glow-2" />

      <header className="landing-header">
        <div className="landing-brand">
          <div className="brand-mark">PQ</div>
          <div>
            <div className="brand-text">{cfg.brand_name}</div>
            <div className="brand-sub">AFFILIATE</div>
          </div>
        </div>
        {typeof loginTo === "string" && loginTo.startsWith("http") ? (
          <a href={loginTo} className="btn btn-primary">{cfg.landing_cta}</a>
        ) : (
          <Link to={loginTo} className="btn btn-primary">{cfg.landing_cta}</Link>
        )}
      </header>

      <main className="landing-hero">
        <div className="landing-badge">{cfg.site_name} · Partner Programı</div>
        <h1>{cfg.landing_title}</h1>
        <p className="landing-sub">{cfg.landing_subtitle}</p>
        <p className="landing-desc">{cfg.landing_description}</p>

        <div className="landing-actions">
          {typeof loginTo === "string" && loginTo.startsWith("http") ? (
            <a href={loginTo} className="btn btn-primary btn-lg">{cfg.landing_cta}</a>
          ) : (
            <Link to={loginTo} className="btn btn-primary btn-lg">{cfg.landing_cta}</Link>
          )}
        </div>

        <div className="landing-features">
          <div className="landing-feat">
            <div className="landing-feat-ico">📊</div>
            <div className="landing-feat-title">Canlı Raporlar</div>
            <div className="landing-feat-sub">Yatırım, çekim ve komisyon anlık</div>
          </div>
          <div className="landing-feat">
            <div className="landing-feat-ico">🔗</div>
            <div className="landing-feat-title">Referans Linkleri</div>
            <div className="landing-feat-sub">Ana + alt btag ile kampanya takibi</div>
          </div>
          <div className="landing-feat">
            <div className="landing-feat-ico">💬</div>
            <div className="landing-feat-title">Canlı Destek</div>
            <div className="landing-feat-sub">Yönetim ekibiyle anlık iletişim</div>
          </div>
        </div>

        <div className="landing-highlight">
          <span className="soon-pill" style={{ marginBottom: 12 }}>✨ {cfg.landing_highlight}</span>
        </div>
      </main>

      <footer className="landing-footer">
        © {new Date().getFullYear()} {cfg.brand_name} Affiliate · {cfg.site_name}
      </footer>
    </div>
  );
}
