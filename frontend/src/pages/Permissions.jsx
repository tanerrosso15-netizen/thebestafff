import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import Switch from "../components/Switch";
import { Icon } from "../components/Icons";
import api, { apiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

function emptyPerms(modules) {
  const o = {};
  (modules || []).forEach((m) => {
    o[m.key] = { view: false, edit: false, delete: false };
  });
  return o;
}

export default function Permissions() {
  const { can } = useAuth();
  const toast = useToast();
  const [modules, setModules] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [perms, setPerms] = useState({});
  const [editId, setEditId] = useState(null);
  const [openMod, setOpenMod] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [m, g] = await Promise.all([
        api.get("/api/permissions/modules"),
        api.get("/api/permissions"),
      ]);
      setModules(m.data.modules || []);
      setGroups(g.data);
      if (!editId && !name) {
        setPerms(emptyPerms(m.data.modules));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startCreate() {
    setEditId(null);
    setName("");
    setPerms(emptyPerms(modules));
    setOpenMod(modules[0]?.key || null);
  }

  function startEdit(g) {
    setEditId(g.id);
    setName(g.name);
    setPerms({ ...emptyPerms(modules), ...g.permissions });
    setOpenMod(modules[0]?.key || null);
  }

  function togglePerm(modKey, action) {
    setPerms((p) => ({
      ...p,
      [modKey]: { ...p[modKey], [action]: !p[modKey]?.[action] },
    }));
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Yetki adı gerekli.");
      return;
    }
    setBusy(true);
    try {
      if (editId) {
        await api.put(`/api/permissions/${editId}`, { name: name.trim(), permissions: perms });
        toast.success("Yetki grubu güncellendi.");
      } else {
        await api.post("/api/permissions", { name: name.trim(), permissions: perms });
        toast.success("Yetki grubu oluşturuldu.");
      }
      startCreate();
      load();
    } catch (ex) {
      toast.error(apiError(ex));
    } finally {
      setBusy(false);
    }
  }

  async function remove(g) {
    if (!confirm(`"${g.name}" silinsin mi?`)) return;
    try {
      await api.delete(`/api/permissions/${g.id}`);
      toast.success("Silindi.");
      if (editId === g.id) startCreate();
      load();
    } catch (ex) {
      toast.error(apiError(ex));
    }
  }

  const canEdit = can("permissions", "edit");
  const canDelete = can("permissions", "delete");

  return (
    <Layout title="Yetkilendirme">
      <div className="page-head">
        <div>
          <div className="section-title">Yetkilendirme</div>
          <div className="section-sub">Önce yetki grubu oluşturun, sonra kullanıcıya atayın</div>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={startCreate}>
            <Icon.plus width={16} height={16} /> Yeni Yetki Grubu
          </button>
        )}
      </div>

      <div className="perm-shell">
        <div className="card perm-list">
          <div className="card-head"><div className="card-title">Yetkilendirme</div></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Yetki Adı</th><th>İşlemler</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={2}><div className="empty"><div className="spinner" style={{ margin: "0 auto" }} /></div></td></tr>
                ) : groups.length === 0 ? (
                  <tr><td colSpan={2}><div className="empty">Henüz yetki grubu yok</div></td></tr>
                ) : (
                  groups.map((g) => (
                    <tr key={g.id} className={editId === g.id ? "perm-row-active" : ""}>
                      <td style={{ fontWeight: 700 }}>{g.name}{g.is_system && <span className="badge purple" style={{ marginLeft: 8 }}>Sistem</span>}</td>
                      <td>
                        <div className="btn-row">
                          {canEdit && (
                            <button className="btn btn-sm btn-primary" onClick={() => startEdit(g)}>Düzenle</button>
                          )}
                          {canDelete && !g.is_system && (
                            <button className="btn btn-sm btn-danger" onClick={() => remove(g)}>Sil</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card perm-form">
          <div className="card-head"><div className="card-title">Yetki Yönetimi</div></div>
          <div className="card-body">
            {!canEdit ? (
              <div className="empty">Düzenleme yetkiniz yok — salt görüntüleme</div>
            ) : (
              <>
                <div className="field">
                  <label>Yetki Adı</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Yetki adını buraya giriniz"
                  />
                </div>
                <div className="field">
                  <label>İzinler</label>
                  <div className="perm-accordion">
                    {modules.map((m) => (
                      <div className="perm-acc-item" key={m.key}>
                        <button
                          type="button"
                          className="perm-acc-head"
                          onClick={() => setOpenMod(openMod === m.key ? null : m.key)}
                        >
                          <span>{m.label}</span>
                          <Icon.chevron width={16} height={16} style={{ transform: openMod === m.key ? "rotate(180deg)" : "" }} />
                        </button>
                        {openMod === m.key && (
                          <div className="perm-acc-body">
                            {["view", "edit", "delete"].map((action) => (
                              <div className="perm-toggle-row" key={action}>
                                <span className={action === "edit" ? "perm-edit-lbl" : ""}>
                                  {action === "view" ? "Görüntüle" : action === "edit" ? "Düzenle" : "Sil"}
                                </span>
                                <Switch
                                  on={!!perms[m.key]?.[action]}
                                  onClick={() => togglePerm(m.key, action)}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary" onClick={save} disabled={busy}>
                  {busy ? "Kaydediliyor..." : editId ? "Güncelle" : "Oluştur"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
