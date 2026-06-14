import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import Switch from "../components/Switch";
import { Icon } from "../components/Icons";
import api, { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import { dateFmt } from "../utils/format";

const EMPTY = { name: "", email: "", password: "", role: "affiliate", is_active: true, commission_rate: 25 };

const ROLE_LABEL = { admin: "ADMIN", manager: "Yönetici", affiliate: "Affiliate" };
const ROLE_CLS = { admin: "purple", manager: "blue", affiliate: "gray" };

export default function Users() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get("/api/users");
      setRows(r.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setModal({ mode: "create" }); }
  function openEdit(u) {
    setForm({ name: u.name, email: u.email, password: "", role: u.role, is_active: u.is_active });
    setModal({ mode: "edit", data: u });
  }

  async function save() {
    setBusy(true);
    try {
      if (modal.mode === "create") {
        await api.post("/api/users", {
          name: form.name, email: form.email, password: form.password,
          role: form.role, is_active: form.is_active,
          commission_rate: Number(form.commission_rate),
        });
        toast.success("Kullanıcı oluşturuldu.");
      } else {
        const payload = { name: form.name, email: form.email, role: form.role, is_active: form.is_active };
        if (form.password) payload.password = form.password;
        await api.put(`/api/users/${modal.data.id}`, payload);
        toast.success("Güncellendi.");
      }
      setModal(null);
      load();
    } catch (ex) {
      toast.error(apiError(ex));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(u) {
    try { await api.patch(`/api/users/${u.id}/toggle`); load(); }
    catch (ex) { toast.error(apiError(ex)); }
  }
  async function remove(u) {
    if (!confirm(`${u.name} silinsin mi?`)) return;
    try { await api.delete(`/api/users/${u.id}`); toast.success("Silindi."); load(); }
    catch (ex) { toast.error(apiError(ex)); }
  }

  return (
    <Layout title="Kullanıcılar">
      <div className="page-head">
        <div>
          <div className="section-title">Kullanıcılar</div>
          <div className="section-sub">Panel giriş hesapları (admin, yönetici, affiliate)</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Icon.plus width={16} height={16} /> Yeni Kullanıcı</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>ID</th><th>Adı</th><th>E-Posta Adresi</th><th>Yetki</th><th>Oluşturma Tarihi</th><th>Aktif</th><th>İşlemler</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><div className="empty"><div className="spinner" style={{ margin: "0 auto" }} /></div></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7}><div className="empty"><div className="emoji">👤</div>Kullanıcı yok</div></td></tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.id}>
                    <td><span className="chip">{u.id}</span></td>
                    <td style={{ fontWeight: 700 }}>{u.name}</td>
                    <td className="muted">{u.email}</td>
                    <td><span className={`badge ${ROLE_CLS[u.role] || "gray"}`}>{ROLE_LABEL[u.role] || u.role}</span></td>
                    <td className="muted">{dateFmt(u.created_at)}</td>
                    <td><Switch on={u.is_active} onClick={() => toggle(u)} /></td>
                    <td>
                      <div className="btn-row">
                        <button className="btn btn-ghost btn-icon" onClick={() => openEdit(u)} title="Düzenle"><Icon.edit width={15} height={15} /></button>
                        <button className="btn btn-danger btn-icon" onClick={() => remove(u)} title="Sil"><Icon.trash width={15} height={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal
          title={modal.mode === "create" ? "Yeni Kullanıcı" : "Kullanıcı Düzenle"}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>İptal</button>
              <button className="btn btn-primary" onClick={save} disabled={busy || !form.name || !form.email}>{busy ? "..." : "Kaydet"}</button>
            </>
          }
        >
          <div className="field"><label>Adı *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>E-Posta *</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="grid grid-2">
            <div className="field">
              <label>Yetki</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="affiliate">Affiliate</option>
                <option value="manager">Yönetici</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="field">
              <label>Parola {modal.mode === "edit" && "(boş = değişmez)"}</label>
              <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
          {modal.mode === "create" && form.role === "affiliate" && (
            <div className="field">
              <label>Komisyon Oranı (%)</label>
              <input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} />
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                Affiliate rolü seçildiğinde otomatik referans linki (btag) oluşturulur.
              </div>
            </div>
          )}
          <div className="field" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Switch on={form.is_active} onClick={() => setForm({ ...form, is_active: !form.is_active })} />
            <span>Aktif</span>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
