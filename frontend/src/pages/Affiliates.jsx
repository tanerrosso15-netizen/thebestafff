import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import Switch from "../components/Switch";
import CopyBox from "../components/CopyBox";
import { Icon } from "../components/Icons";
import api, { apiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { dateFmt, money, num, pct } from "../utils/format";

const EMPTY = {
  name: "",
  email: "",
  btag: "",
  commission_rate: 25,
  group_id: "",
  parent_btag: "",
  is_active: true,
  create_login: true,
  password: "",
};

export default function Affiliates() {
  const { isAdmin, impersonate } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [groups, setGroups] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | {mode, data}
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = q ? { q } : {};
      const [a, g] = await Promise.all([
        api.get("/api/affiliates", { params }),
        isAdmin ? api.get("/api/groups") : Promise.resolve({ data: [] }),
      ]);
      setRows(a.data);
      setGroups(g.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm(EMPTY);
    setModal({ mode: "create" });
  }
  function openEdit(a) {
    setForm({
      name: a.name,
      email: a.email,
      commission_rate: a.commission_rate,
      group_id: a.group_id || "",
      is_active: a.is_active,
    });
    setModal({ mode: "edit", data: a });
  }

  async function save() {
    setBusy(true);
    try {
      if (modal.mode === "create") {
        const payload = {
          name: form.name,
          email: form.email,
          btag: form.btag || undefined,
          commission_rate: Number(form.commission_rate),
          group_id: form.group_id ? Number(form.group_id) : null,
          parent_btag: form.parent_btag || null,
          is_active: form.is_active,
          create_login: form.create_login,
          password: form.password || undefined,
        };
        await api.post("/api/affiliates", payload);
        toast.success("Affiliate oluşturuldu.");
      } else {
        await api.put(`/api/affiliates/${modal.data.id}`, {
          name: form.name,
          email: form.email,
          commission_rate: Number(form.commission_rate),
          group_id: form.group_id ? Number(form.group_id) : null,
          is_active: form.is_active,
        });
        toast.success("Affiliate güncellendi.");
      }
      setModal(null);
      load();
    } catch (ex) {
      toast.error(apiError(ex));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(a) {
    try {
      await api.patch(`/api/affiliates/${a.id}/toggle`);
      load();
    } catch (ex) {
      toast.error(apiError(ex));
    }
  }

  async function remove(a) {
    if (!confirm(`${a.name} silinsin mi?`)) return;
    try {
      await api.delete(`/api/affiliates/${a.id}`);
      toast.success("Silindi.");
      load();
    } catch (ex) {
      toast.error(apiError(ex));
    }
  }

  async function enterPanel(a) {
    try {
      const r = await api.post(`/api/affiliates/${a.id}/impersonate`);
      impersonate(r.data.access_token, a.name);
    } catch (ex) {
      toast.error(apiError(ex));
    }
  }

  async function openSubReport(a) {
    setReport({ affiliate: a, rows: [], totals: null });
    setReportLoading(true);
    try {
      const r = await api.get(`/api/affiliates/${a.id}/subbtag-report`);
      setReport(r.data);
    } catch (ex) {
      toast.error(apiError(ex));
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <Layout title={isAdmin ? "Affiliate" : "Alt Affiliatelerim"}>
      <div className="page-head">
        <div>
          <div className="section-title">Affiliate Listesi</div>
          <div className="section-sub">
            Referans linki sahibi affiliatelerin performansı
          </div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Icon.plus width={16} height={16} /> Affiliate Oluştur
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body" style={{ display: "flex", gap: 12 }}>
          <div className="search-box" style={{ width: 320, display: "flex" }}>
            <Icon.search width={16} height={16} />
            <input
              placeholder="Ad, e-posta veya btag ara"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>
          <button className="btn btn-ghost" onClick={load}>
            Filtrele
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Adı Soyadı</th>
                <th>E-Posta</th>
                <th>BTag</th>
                <th>W. Komisyon</th>
                <th>Bakiye</th>
                <th>Toplam Tıklama</th>
                <th>Komisyon</th>
                <th>Toplam Oyuncular</th>
                <th>Oluşturma</th>
                <th>Aktif</th>
                {isAdmin && <th>İşlemler</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11}><div className="empty"><div className="spinner" style={{ margin: "0 auto" }} /></div></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={11}><div className="empty"><div className="emoji">📭</div>Affiliate bulunamadı</div></td></tr>
              ) : (
                rows.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 700 }}>{a.name}</td>
                    <td className="muted">{a.email || "-"}</td>
                    <td><span className="chip">{a.btag}</span></td>
                    <td className="pos">{money(a.w_commission)}</td>
                    <td>{money(a.balance)}</td>
                    <td>{num(a.total_clicks)}</td>
                    <td>{pct(a.commission_rate)}</td>
                    <td><span className="badge blue">{num(a.total_players)}</span></td>
                    <td className="muted">{dateFmt(a.created_at)}</td>
                    <td>
                      {isAdmin ? (
                        <Switch on={a.is_active} onClick={() => toggle(a)} />
                      ) : (
                        <span className={`badge ${a.is_active ? "green" : "gray"}`}>
                          {a.is_active ? "Aktif" : "Pasif"}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="btn-row">
                          <button className="btn btn-ghost btn-icon" onClick={() => openSubReport(a)} title="Alt Btag Raporu">
                            <Icon.reports width={15} height={15} />
                          </button>
                          <button className="btn btn-ghost btn-icon" onClick={() => enterPanel(a)} title="Panele Gir">
                            <Icon.login width={15} height={15} />
                          </button>
                          <button className="btn btn-ghost btn-icon" onClick={() => openEdit(a)} title="Düzenle">
                            <Icon.edit width={15} height={15} />
                          </button>
                          <button className="btn btn-danger btn-icon" onClick={() => remove(a)} title="Sil">
                            <Icon.trash width={15} height={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {report && (
        <Modal
          title={`Alt Btag Raporu — ${report.affiliate?.name || ""}`}
          onClose={() => setReport(null)}
          wide
          footer={<button className="btn btn-ghost" onClick={() => setReport(null)}>Kapat</button>}
        >
          {reportLoading ? (
            <div className="empty"><div className="spinner" style={{ margin: "0 auto" }} /></div>
          ) : (
            <>
              <div className="grid grid-4" style={{ marginBottom: 16 }}>
                <div className="stat">
                  <div className="stat-label">Ana Btag</div>
                  <div className="stat-value" style={{ fontSize: 18 }}><span className="chip">{report.affiliate?.btag}</span></div>
                  <div className="stat-foot">Komisyon: {pct(report.affiliate?.commission_rate)}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Toplam Oyuncu</div>
                  <div className="stat-value">{num(report.totals?.players)}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Net Fark</div>
                  <div className="stat-value" style={{ color: (report.totals?.net || 0) >= 0 ? "var(--accent)" : "var(--danger)" }}>
                    {money(report.totals?.net)}
                  </div>
                  <div className="stat-foot">Yatırım − Çekim</div>
                </div>
                <div className="stat accent">
                  <div className="stat-label">Toplam Komisyon</div>
                  <div className="stat-value">{money(report.totals?.commission)}</div>
                </div>
              </div>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Btag</th><th>Etiket</th><th>Oyuncu</th>
                      <th>Yatırım</th><th>Çekim</th><th>Net</th><th>Komisyon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.rows || []).map((r) => (
                      <tr key={r.btag}>
                        <td><span className="chip">{r.btag}</span>{r.is_main && <span className="badge purple" style={{ marginLeft: 6 }}>Ana</span>}</td>
                        <td className="muted">{r.label}</td>
                        <td>{num(r.players)}</td>
                        <td className="pos">{money(r.deposit)}</td>
                        <td className="neg">{money(r.withdrawal)}</td>
                        <td style={{ color: r.net >= 0 ? "var(--accent)" : "var(--danger)", fontWeight: 700 }}>{money(r.net)}</td>
                        <td className="pos">{money(r.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Modal>
      )}

      {modal && (
        <Modal
          title={modal.mode === "create" ? "Yeni Affiliate" : "Affiliate Düzenle"}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>İptal</button>
              <button className="btn btn-primary" onClick={save} disabled={busy || !form.name}>
                {busy ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </>
          }
        >
          <div className="field">
            <label>Adı Soyadı *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>E-Posta</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label>Komisyon Oranı (%)</label>
              <input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} />
            </div>
            <div className="field">
              <label>Grup</label>
              <select value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}>
                <option value="">— Yok —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>
          {modal.mode === "create" && (
            <>
              <div className="grid grid-2">
                <div className="field">
                  <label>BTag (boş = otomatik)</label>
                  <input value={form.btag} onChange={(e) => setForm({ ...form, btag: e.target.value })} placeholder="otomatik üretilir" />
                </div>
                <div className="field">
                  <label>Üst Affiliate btag (opsiyonel)</label>
                  <input value={form.parent_btag} onChange={(e) => setForm({ ...form, parent_btag: e.target.value })} placeholder="çok kademeli" />
                </div>
              </div>
              <div className="field" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Switch on={form.create_login} onClick={() => setForm({ ...form, create_login: !form.create_login })} />
                <span>Giriş hesabı oluştur (affiliate panele girebilsin)</span>
              </div>
              {form.create_login && (
                <div className="field">
                  <label>Parola (boş = affiliate123)</label>
                  <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="affiliate123" />
                </div>
              )}
            </>
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
