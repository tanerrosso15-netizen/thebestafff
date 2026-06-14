import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Icon } from "../components/Icons";
import api, { apiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const INFRA = [
  { value: "casinopera", label: "CasinoOpera" },
  { value: "lynon", label: "Lynon" },
  { value: "custom", label: "Diğer" },
];

const TRIAL = [
  { value: "none", label: "No Trial" },
  { value: "7d", label: "7 Gün" },
  { value: "14d", label: "14 Gün" },
  { value: "30d", label: "30 Gün" },
];

const EMPTY = {
  name: "",
  infrastructure: "casinopera",
  trial_period: "none",
  fetcher_email: "",
  fetcher_password: "",
  fetcher_otp_secret: "",
  active_domain: "",
  active_affiliate_domain: "",
  backoffice_url: "",
  site_id: "",
  is_active: true,
};

export default function Merchants() {
  const { can } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const canEdit = can("merchants", "edit");

  async function load() {
    const r = await api.get("/api/merchants");
    setRows(r.data);
    const active = r.data.find((m) => m.is_active);
    if (active && !editId) {
      setForm({ ...EMPTY, ...active });
      setEditId(active.id);
    }
  }

  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    if (!canEdit) return;
    setBusy(true);
    try {
      if (editId) {
        await api.put(`/api/merchants/${editId}`, form);
        toast.success("Merchant güncellendi.");
      } else {
        const r = await api.post("/api/merchants", form);
        setEditId(r.data.id);
        toast.success("Merchant oluşturuldu.");
      }
      load();
    } catch (ex) {
      toast.error(apiError(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout title="Merchant Bilgileri">
      <div className="page-head">
        <div>
          <div className="section-title">Merchant Information</div>
          <div className="section-sub">CasinoOpera fetcher, domain ve altyapı ayarları</div>
        </div>
      </div>

      <form className="card merchant-form" onSubmit={save}>
        <div className="card-head"><div className="card-title">Merchant Information</div></div>
        <div className="card-body">
          <div className="field">
            <label>Merchant Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter merchant name"
              disabled={!canEdit}
              required
            />
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label>Infrastructure <span className="req">*</span></label>
              <select
                value={form.infrastructure}
                onChange={(e) => setForm({ ...form, infrastructure: e.target.value })}
                disabled={!canEdit}
              >
                {INFRA.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Trial Period <span className="req">*</span></label>
              <select
                value={form.trial_period}
                onChange={(e) => setForm({ ...form, trial_period: e.target.value })}
                disabled={!canEdit}
              >
                {TRIAL.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label>Fetcher Email</label>
              <input
                type="email"
                value={form.fetcher_email}
                onChange={(e) => setForm({ ...form, fetcher_email: e.target.value })}
                placeholder="Enter fetcher email"
                disabled={!canEdit}
              />
            </div>
            <div className="field">
              <label>Fetcher Password</label>
              <input
                type="password"
                value={form.fetcher_password}
                onChange={(e) => setForm({ ...form, fetcher_password: e.target.value })}
                placeholder="Enter fetcher password"
                disabled={!canEdit}
              />
            </div>
          </div>
          <div className="field">
            <label>Fetcher OTP Secret</label>
            <input
              value={form.fetcher_otp_secret}
              onChange={(e) => setForm({ ...form, fetcher_otp_secret: e.target.value })}
              placeholder="Enter fetcher otp secret"
              disabled={!canEdit}
            />
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label>Active Domain</label>
              <input
                value={form.active_domain}
                onChange={(e) => setForm({ ...form, active_domain: e.target.value })}
                placeholder="https://your-platform.com/"
                disabled={!canEdit}
              />
            </div>
            <div className="field">
              <label>Active Affiliate Domain</label>
              <input
                value={form.active_affiliate_domain}
                onChange={(e) => setForm({ ...form, active_affiliate_domain: e.target.value })}
                placeholder="https://aff.your-platform.com/"
                disabled={!canEdit}
              />
            </div>
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label>Backoffice API URL</label>
              <input
                value={form.backoffice_url}
                onChange={(e) => setForm({ ...form, backoffice_url: e.target.value })}
                placeholder="https://backoffice.example/api/..."
                disabled={!canEdit}
              />
            </div>
            <div className="field">
              <label>Site ID</label>
              <input
                value={form.site_id}
                onChange={(e) => setForm({ ...form, site_id: e.target.value })}
                placeholder="125"
                disabled={!canEdit}
              />
            </div>
          </div>
          {canEdit && (
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Kaydediliyor..." : "Kaydet"}
            </button>
          )}
        </div>
      </form>

      {rows.length > 1 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head"><div className="card-title">Tüm Merchant Kayıtları</div></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Ad</th><th>Altyapı</th><th>Aktif</th></tr></thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} onClick={() => { setEditId(m.id); setForm({ ...EMPTY, ...m }); }} style={{ cursor: "pointer" }}>
                    <td>{m.name}</td>
                    <td>{m.infrastructure}</td>
                    <td>{m.is_active ? <span className="badge green">Aktif</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
