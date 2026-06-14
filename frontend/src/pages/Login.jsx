import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiError } from "../api/client";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (ex) {
      setErr(apiError(ex, "Giriş başarısız."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="lh-brand">
          <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 18 }}>
            AP
          </div>
          <div className="brand-text" style={{ fontSize: 22 }}>
            Affiliate
          </div>
        </div>
        <div className="lh-mid">
          <h1>
            Affiliate
            <br />
            Yönetim Paneli
          </h1>
          <p>
            Referans linki tabanlı affiliate yönetim sistemi.
            Oyuncularınızı, komisyonlarınızı ve performansınızı tek panelden yönetin.
          </p>
          <div className="lh-stats">
            <div className="lh-stat">
              <div className="v">Gerçek Zamanlı</div>
              <div className="l">Veri Senkronizasyonu</div>
            </div>
            <div className="lh-stat">
              <div className="v">Çok Kademeli</div>
              <div className="l">Referans Sistemi</div>
            </div>
          </div>
        </div>
        <div style={{ zIndex: 1, opacity: 0.7, fontSize: 13 }}>
          © {new Date().getFullYear()} Affiliate Panel
        </div>
      </div>

      <div className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <h2>Tekrar hoş geldiniz</h2>
          <div className="sub">Devam etmek için giriş yapın</div>
          {err && <div className="login-err">{err}</div>}
          <div className="field">
            <label>E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>
          <div className="field">
            <label>Parola</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
