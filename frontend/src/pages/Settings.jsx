import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Icon } from "../components/Icons";
import api, { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";

export default function Settings() {
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState(null);
  const [cookie, setCookie] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    const [s, st] = await Promise.all([
      api.get("/api/system/settings"),
      api.get("/api/system/integration/status").catch(() => ({ data: null })),
    ]);
    setSettings(s.data);
    setStatus(st.data);
  }
  useEffect(() => { load(); }, []);

  async function saveSettings() {
    setBusy(true);
    try {
      await api.put("/api/system/settings", [
        { key: "brand_name", value: settings.brand_name },
        { key: "site_name", value: settings.site_name },
        { key: "referral_base_url", value: settings.referral_base_url },
        { key: "affiliate_domain", value: settings.affiliate_domain || "" },
        { key: "panel_login_url", value: settings.panel_login_url || "/login" },
        { key: "landing_title", value: settings.landing_title || "" },
        { key: "landing_subtitle", value: settings.landing_subtitle || "" },
        { key: "landing_description", value: settings.landing_description || "" },
        { key: "landing_cta", value: settings.landing_cta || "" },
        { key: "landing_highlight", value: settings.landing_highlight || "" },
      ]);
      toast.success("Ayarlar kaydedildi.");
    } catch (ex) { toast.error(apiError(ex)); }
    finally { setBusy(false); }
  }

  async function saveCookie() {
    if (!cookie.trim()) return;
    setBusy(true);
    try {
      await api.put("/api/system/cookie", { cookie });
      toast.success("Cookie kaydedildi.");
      setCookie("");
      load();
    } catch (ex) { toast.error(apiError(ex)); }
    finally { setBusy(false); }
  }

  async function runSync() {
    setSyncing(true);
    try {
      const r = await api.post("/api/system/sync");
      toast.success(`Senkron tamam — ${r.data.fetched} oyuncu işlendi (${r.data.live ? "canlı" : "yerel"}).`);
      load();
    } catch (ex) { toast.error(apiError(ex)); }
    finally { setSyncing(false); }
  }

  if (!settings) return <Layout title="Sistem Ayarları"><div className="spinner" style={{ margin: "40px auto" }} /></Layout>;

  return (
    <Layout title="Sistem Ayarları">
      <div className="page-head">
        <div>
          <div className="section-title">Sistem Ayarları</div>
          <div className="section-sub">Marka, referans linki ve CasinoPera entegrasyonu</div>
        </div>
        <button className="btn btn-primary" onClick={runSync} disabled={syncing}>
          <Icon.refresh width={16} height={16} /> {syncing ? "Senkronize ediliyor..." : "Şimdi Senkronize Et"}
        </button>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head"><div className="card-title">Marka & Panel</div></div>
          <div className="card-body">
            <div className="field"><label>Marka Adı</label><input value={settings.brand_name} onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })} /></div>
            <div className="field"><label>Site Adı</label><input value={settings.site_name} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })} /></div>
            <div className="field">
              <label>Referans Linki Kök Adresi (CasinoPera)</label>
              <input value={settings.referral_base_url} onChange={(e) => setSettings({ ...settings, referral_base_url: e.target.value })} />
            </div>
            <div className="field">
              <label>Affiliate Domaini (yönlendirme — opsiyonel)</label>
              <input value={settings.affiliate_domain || ""} onChange={(e) => setSettings({ ...settings, affiliate_domain: e.target.value })} placeholder="https://aff.example.com/" />
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                Doğrudan referans linki: <code>{(settings.affiliate_domain || settings.referral_base_url)}?btag=&lt;btag&gt;</code>
                <br />Site size bir affiliate domaini verdiğinde buraya girin; tüm doğrudan linkler bu domaini kullanır.
              </div>
            </div>
            <button className="btn btn-primary" onClick={saveSettings} disabled={busy}>Kaydet</button>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">CasinoPera Entegrasyonu</div>
            {status && (
              <span className={`badge ${status.alive ? "green" : status.configured ? "amber" : "gray"}`}>
                {status.alive ? "Bağlı" : status.configured ? "Oturum geçersiz" : "Yapılandırılmadı"}
              </span>
            )}
          </div>
          <div className="card-body">
            {status && (
              <>
                <div className="line-row"><span className="lbl">Site</span><span className="val">{status.site_name} (#{status.site_id})</span></div>
                <div className="line-row"><span className="lbl">Backoffice</span><span className="val" style={{ fontSize: 11 }}>{status.base_url}</span></div>
                <div className="line-row"><span className="lbl">Cookie</span><span className="val">{settings.cookie_configured ? "Tanımlı" : "Yok"}</span></div>
                {status.error && <div style={{ fontSize: 12.5, color: "var(--danger)", marginTop: 8 }}>{status.error}</div>}
              </>
            )}
            <div className="field" style={{ marginTop: 16 }}>
              <label>Oturum Cookie'si (yapıştırın)</label>
              <textarea rows={4} value={cookie} onChange={(e) => setCookie(e.target.value)} placeholder=".AspNetCore.Cookies=...; ..." />
            </div>
            <button className="btn btn-primary" onClick={saveCookie} disabled={busy || !cookie.trim()}>Cookie Kaydet</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head">
          <div className="card-title">Affiliate Yönlendirme Sayfası</div>
          <a href="/go" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Önizle → /go</a>
        </div>
        <div className="card-body">
          <p style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 16 }}>
            Statik yönlendirme sayfası. Heroku/Cloudflare üzerinden affiliate domaininize yönlendirdiğinizde
            ziyaretçiler bu sayfayı görür; &quot;Giriş Yap&quot; butonu affiliate paneline yönlendirir.
          </p>
          <div className="grid grid-2">
            <div className="field">
              <label>Başlık</label>
              <input value={settings.landing_title || ""} onChange={(e) => setSettings({ ...settings, landing_title: e.target.value })} />
            </div>
            <div className="field">
              <label>Alt Başlık</label>
              <input value={settings.landing_subtitle || ""} onChange={(e) => setSettings({ ...settings, landing_subtitle: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Açıklama</label>
            <textarea rows={3} value={settings.landing_description || ""} onChange={(e) => setSettings({ ...settings, landing_description: e.target.value })} />
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label>Giriş Butonu Metni</label>
              <input value={settings.landing_cta || ""} onChange={(e) => setSettings({ ...settings, landing_cta: e.target.value })} />
            </div>
            <div className="field">
              <label>Öne Çıkan Vurgu</label>
              <input value={settings.landing_highlight || ""} onChange={(e) => setSettings({ ...settings, landing_highlight: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Panel Giriş URL&apos;si</label>
            <input value={settings.panel_login_url || "/login"} onChange={(e) => setSettings({ ...settings, panel_login_url: e.target.value })} placeholder="/login veya https://panel.example.com/login" />
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
              Farklı bir affiliate panel domaini kullanıyorsanız tam URL girin (örn. https://aff-panel.example.com/login).
            </div>
          </div>
          <button className="btn btn-primary" onClick={saveSettings} disabled={busy}>Kaydet</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head"><div className="card-title">Senkronizasyon</div></div>
        <div className="card-body">
          <div className="line-row"><span className="lbl">Otomatik senkron</span><span className="val">{settings.sync_enabled ? "Açık" : "Kapalı"}</span></div>
          <div className="line-row"><span className="lbl">Aralık</span><span className="val">{settings.sync_interval_seconds} sn</span></div>
          <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 10 }}>
            Oyuncu verileri belirlenen aralıkta otomatik olarak CasinoPera'dan çekilir ve btag eşleşmesine göre affiliatelere bağlanır.
            Cookie yoksa sistem yerel (SQL) veriyle çalışır.
          </p>
        </div>
      </div>
    </Layout>
  );
}
