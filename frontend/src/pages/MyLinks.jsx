import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import CopyBox from "../components/CopyBox";
import { Icon } from "../components/Icons";
import api, { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import { money, num, pct } from "../utils/format";

export default function MyLinks() {
  const toast = useToast();
  const [dash, setDash] = useState(null);
  const [subs, setSubs] = useState([]);
  const [report, setReport] = useState(null);
  const [suffix, setSuffix] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get("/api/dashboard");
      setDash(r.data);
      if (r.data?.affiliate) {
        const [s, rep] = await Promise.all([
          api.get("/api/subbtags"),
          api.get(`/api/affiliates/${r.data.affiliate.id}/subbtag-report`).catch(() => ({ data: null })),
        ]);
        setSubs(s.data);
        setReport(rep.data);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function createSub() {
    if (!suffix.trim()) return;
    setBusy(true);
    try {
      await api.post("/api/subbtags", { suffix, label });
      toast.success("Alt btag oluşturuldu.");
      setSuffix(""); setLabel("");
      load();
    } catch (ex) {
      toast.error(apiError(ex));
    } finally {
      setBusy(false);
    }
  }

  async function removeSub(s) {
    if (!confirm(`${s.btag} silinsin mi?`)) return;
    try {
      await api.delete(`/api/subbtags/${s.id}`);
      toast.success("Silindi.");
      load();
    } catch (ex) {
      toast.error(apiError(ex));
    }
  }

  if (loading || !dash?.affiliate)
    return <Layout title="Referans Linklerim"><div className="spinner" style={{ margin: "40px auto" }} /></Layout>;

  const a = dash.affiliate;
  const trackLink = a.btag ? `${window.location.origin}/r/${a.btag}` : "";
  const reportByBtag = {};
  (report?.rows || []).forEach((r) => { reportByBtag[r.btag] = r; });

  return (
    <Layout title="Referans Linklerim">
      <div className="page-head">
        <div>
          <div className="section-title">Referans Linklerim</div>
          <div className="section-sub">Bu linkler üzerinden gelen oyuncular size bağlanır</div>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="stat hero"><div className="stat-label">Toplam Tıklama</div><div className="stat-value">{num(a.total_clicks)}</div><div className="stat-ico"><Icon.link /></div></div>
        <div className="stat"><div className="stat-label">Toplam Oyuncu</div><div className="stat-value">{num(dash.total_players)}</div><div className="stat-ico"><Icon.players /></div></div>
        <div className="stat accent"><div className="stat-label">Kazanılan Komisyon</div><div className="stat-value">{money(a.w_commission)}</div><div className="stat-ico"><Icon.cash /></div></div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-head"><div className="card-title">Doğrudan Referans Linki</div><span className="badge blue">btag: {a.btag}</span></div>
        <div className="card-body">
          <p style={{ color: "var(--ink-soft)", marginBottom: 14, fontSize: 14 }}>
            Bu link, sitenin verdiği affiliate domaini üzerinden oyuncuyu btag bilgisiyle yönlendirir.
            (Domain henüz tanımlı değilse Sistem Ayarları'ndan eklenir.)
          </p>
          <CopyBox value={a.referral_link} label="Referans linki" />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <div className="card-title">Alt Btag Oluştur</div>
          <span className="badge purple">{a.btag}_xx</span>
        </div>
        <div className="card-body">
          <p style={{ color: "var(--ink-soft)", marginBottom: 14, fontSize: 14 }}>
            Farklı kampanya/kaynaklarınız için ana btag'inizden ayrı alt btag'ler türetin.
            Örneğin ana btag <strong>{a.btag}</strong> ise, <strong>{a.btag}_tg</strong> gibi.
            Her biri ayrı ayrı raporlanır.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="field" style={{ flex: 1, minWidth: 160 }}>
              <label>Son ek</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="chip">{a.btag}_</span>
                <input value={suffix} onChange={(e) => setSuffix(e.target.value)} placeholder="tg" />
              </div>
            </div>
            <div className="field" style={{ flex: 1, minWidth: 160 }}>
              <label>Etiket (opsiyonel)</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Telegram kampanyası" />
            </div>
            <button className="btn btn-primary" onClick={createSub} disabled={busy || !suffix.trim()}>
              <Icon.plus width={16} height={16} /> Oluştur
            </button>
          </div>

          <div style={{ marginTop: 18 }}>
            {subs.length === 0 ? (
              <div className="empty" style={{ padding: 20 }}>Henüz alt btag yok</div>
            ) : (
              subs.map((s) => {
                const st = reportByBtag[s.btag];
                return (
                  <div className="subbtag-row" key={s.id}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}>
                        <span className="chip">{s.btag}</span>
                        {s.label && <span className="muted" style={{ fontSize: 13 }}>{s.label}</span>}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <CopyBox value={s.referral_link} label="Alt btag linki" />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 700 }}>{num(s.total_clicks)}</div>
                        <div className="muted" style={{ fontSize: 11 }}>Tıklama</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 700 }}>{num(s.total_players)}</div>
                        <div className="muted" style={{ fontSize: 11 }}>Oyuncu</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div className="pos" style={{ fontWeight: 700 }}>{money(st?.commission || 0)}</div>
                        <div className="muted" style={{ fontSize: 11 }}>Komisyon</div>
                      </div>
                      <button className="btn btn-danger btn-icon" onClick={() => removeSub(s)} title="Sil">
                        <Icon.trash width={15} height={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">İzlenebilir Takip Linki</div><span className="badge purple">tıklama sayar</span></div>
        <div className="card-body">
          <p style={{ color: "var(--ink-soft)", marginBottom: 14, fontSize: 14 }}>
            Bu link tıklamayı panele kaydeder, sonra yönlendirir. Tıklama istatistikleri için bunu kullanın.
          </p>
          <CopyBox value={trackLink} label="Takip linki" />
          <div style={{ marginTop: 18 }}>
            <div className="line-row"><span className="lbl">Komisyon Oranınız</span><span className="val">{pct(a.commission_rate)}</span></div>
            <div className="line-row"><span className="lbl">Yatırım Oranı</span><span className="val">{pct(dash.deposit_rate)}</span></div>
            <div className="line-row"><span className="lbl">Alt Affiliate Sayısı</span><span className="val">{num(dash.sub_affiliate_count)}</span></div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
