import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import Switch from "../components/Switch";
import { Icon } from "../components/Icons";
import api, { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import { dateFmt, num, pct } from "../utils/format";

const EMPTY = { name: "", description: "", commission_rate: 25, revenue_share: 0, cpa_amount: 0, is_active: true };

export default function Groups() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get("/api/groups");
      setRows(r.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setModal({ mode: "create" }); }
  function openEdit(g) { setForm({ ...g }); setModal({ mode: "edit", data: g }); }

  async function save() {
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        commission_rate: Number(form.commission_rate),
        revenue_share: Number(form.revenue_share),
        cpa_amount: Number(form.cpa_amount),
        is_active: form.is_active,
      };
      if (modal.mode === "create") await api.post("/api/groups", payload);
      else await api.put(`/api/groups/${modal.data.id}`, payload);
      toast.success("Kaydedildi.");
      setModal(null);
      load();
    } catch (ex) {
      toast.error(apiError(ex));
    } finally {
      setBusy(false);
    }
  }

  async function remove(g) {
    if (!confirm(`${g.name} grubu silinsin mi?`)) return;
    try {
      await api.delete(`/api/groups/${g.id}`);
      toast.success("Silindi.");
      load();
    } catch (ex) { toast.error(apiError(ex)); }
  }

  return (
    <Layout title="Affiliate Grupları">
      <div className="page-head">
        <div>
          <div className="section-title">Affiliate Grupları</div>
          <div className="section-sub">Ortak komisyon ve gelir paylaşım kuralları</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Icon.plus width={16} height={16} /> Grup Oluştur
        </button>
      </div>

      <div className="grid grid-3">
        {loading ? (
          <div className="card"><div className="card-body"><div className="spinner" /></div></div>
        ) : rows.length === 0 ? (
          <div className="card" style={{ gridColumn: "1/-1" }}><div className="empty"><div className="emoji">🗂️</div>Grup yok</div></div>
        ) : (
          rows.map((g) => (
            <div className="card" key={g.id}>
              <div className="card-head">
                <div className="card-title">{g.name}</div>
                <span className={`badge ${g.is_active ? "green" : "gray"}`}>{g.is_active ? "Aktif" : "Pasif"}</span>
              </div>
              <div className="card-body">
                <p style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 14, minHeight: 18 }}>{g.description || "—"}</p>
                <div className="line-row"><span className="lbl">Komisyon</span><span className="val">{pct(g.commission_rate)}</span></div>
                <div className="line-row"><span className="lbl">Gelir Payı</span><span className="val">{pct(g.revenue_share)}</span></div>
                <div className="line-row"><span className="lbl">CPA</span><span className="val">{num(g.cpa_amount)}</span></div>
                <div className="line-row"><span className="lbl">Affiliate Sayısı</span><span className="val">{num(g.affiliate_count)}</span></div>
                <div className="line-row"><span className="lbl">Oluşturma</span><span className="val" style={{ fontSize: 12 }}>{dateFmt(g.created_at)}</span></div>
                <div className="btn-row" style={{ marginTop: 14 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(g)}><Icon.edit width={14} height={14} /> Düzenle</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(g)}><Icon.trash width={14} height={14} /> Sil</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {modal && (
        <Modal
          title={modal.mode === "create" ? "Yeni Grup" : "Grup Düzenle"}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>İptal</button>
              <button className="btn btn-primary" onClick={save} disabled={busy || !form.name}>{busy ? "..." : "Kaydet"}</button>
            </>
          }
        >
          <div className="field"><label>Grup Adı *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Açıklama</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-3">
            <div className="field"><label>Komisyon (%)</label><input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} /></div>
            <div className="field"><label>Gelir Payı (%)</label><input type="number" value={form.revenue_share} onChange={(e) => setForm({ ...form, revenue_share: e.target.value })} /></div>
            <div className="field"><label>CPA</label><input type="number" value={form.cpa_amount} onChange={(e) => setForm({ ...form, cpa_amount: e.target.value })} /></div>
          </div>
          <div className="field" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Switch on={form.is_active} onClick={() => setForm({ ...form, is_active: !form.is_active })} />
            <span>Aktif</span>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
