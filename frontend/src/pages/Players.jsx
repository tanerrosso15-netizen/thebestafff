import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Icon } from "../components/Icons";
import api from "../api/client";
import { dateFmt, money, num } from "../utils/format";

const EMPTY = { player_id: "", name: "", username: "", btag: "", min_balance: "", date_from: "" };

export default function Players() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, per_page: 25 });
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  async function load(p = page) {
    setLoading(true);
    try {
      const params = { page: p, per_page: 25 };
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== "" && v != null) params[k] = v;
      });
      const r = await api.get("/api/players", { params });
      setData(r.data);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1); }, []);

  function applyFilters() { load(1); }
  function reset() { setFilters(EMPTY); setTimeout(() => load(1), 0); }

  async function exportExcel() {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== "" && v != null) params[k] = v;
    });
    const r = await api.get("/api/players/export", { params, responseType: "blob" });
    const url = URL.createObjectURL(new Blob([r.data]));
    const link = document.createElement("a");
    link.href = url;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    link.download = `pqp_oyuncular_${today}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.per_page));

  return (
    <Layout title="Oyuncular">
      <div className="page-head">
        <div>
          <div className="section-title">Oyuncular</div>
          <div className="section-sub">Referans linki ile gelen oyuncular ({num(data.total)})</div>
        </div>
        <button className="btn btn-primary" onClick={exportExcel}>
          <Icon.download width={16} height={16} /> Excel İndir
        </button>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-head"><div className="card-title">Filtreleme</div>
          <button className="btn btn-primary btn-sm" onClick={applyFilters}>Filtre Uygula</button>
        </div>
        <div className="card-body">
          <div className="filter-grid">
            <div className="field"><label>Oyuncu ID</label><input value={filters.player_id} onChange={(e) => setFilters({ ...filters, player_id: e.target.value })} /></div>
            <div className="field"><label>Adı</label><input value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} /></div>
            <div className="field"><label>Kullanıcı Adı</label><input value={filters.username} onChange={(e) => setFilters({ ...filters, username: e.target.value })} /></div>
            <div className="field"><label>BTag</label><input value={filters.btag} onChange={(e) => setFilters({ ...filters, btag: e.target.value })} /></div>
            <div className="field"><label>Min Bakiye</label><input type="number" value={filters.min_balance} onChange={(e) => setFilters({ ...filters, min_balance: e.target.value })} /></div>
            <div className="field"><label>Kayıt Tarihi (sonrası)</label><input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} /></div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={reset}>Temizle</button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Oyuncu ID</th><th>Kullanıcı Adı</th><th>Kategori</th><th>BTag</th>
                <th>Bakiye</th><th>Yatırım</th><th>Çekim</th><th>Kâr/Zarar</th>
                <th>Affiliate</th><th>Kayıt Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10}><div className="empty"><div className="spinner" style={{ margin: "0 auto" }} /></div></td></tr>
              ) : data.items.length === 0 ? (
                <tr><td colSpan={10}><div className="empty"><div className="emoji">🎮</div>Oyuncu bulunamadı</div></td></tr>
              ) : (
                data.items.map((p) => (
                  <tr key={p.id}>
                    <td><span className="chip">{p.external_id}</span></td>
                    <td style={{ fontWeight: 600 }}>{p.username || p.name || "-"}</td>
                    <td>{p.category ? <span className="badge gray">{p.category}</span> : "-"}</td>
                    <td>{p.btag ? <span className="chip">{p.btag}</span> : "-"}</td>
                    <td>{money(p.balance)}</td>
                    <td className="pos">{money(p.deposit_total)}</td>
                    <td className="neg">{money(p.withdrawal_total)}</td>
                    <td className={p.profit_loss >= 0 ? "pos" : "neg"}>{money(p.profit_loss)}</td>
                    <td className="muted">{p.affiliate_name || "-"}</td>
                    <td className="muted">{dateFmt(p.registered_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: "1px solid var(--line)" }}>
            <span className="muted" style={{ fontSize: 13 }}>Sayfa {data.page} / {totalPages}</span>
            <div className="btn-row">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>Önceki</button>
              <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>Sonraki</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
