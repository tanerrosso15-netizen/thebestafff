import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Layout from "../components/Layout";
import api from "../api/client";
import { money, num, pct } from "../utils/format";

export default function Reports() {
  const [affiliates, setAffiliates] = useState([]);
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState(null); // { affiliate, rows, totals }
  const [subLoading, setSubLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [a, d] = await Promise.all([api.get("/api/affiliates"), api.get("/api/dashboard")]);
      setAffiliates(a.data);
      setDash(d.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function openSubReport(a) {
    setSubLoading(true);
    setSub({ loading: true, affiliate: { name: a.name } });
    try {
      const r = await api.get(`/api/affiliates/${a.id}/subbtag-report`);
      setSub(r.data);
    } finally {
      setSubLoading(false);
    }
  }

  const chartData = [...affiliates]
    .sort((x, y) => y.w_commission - x.w_commission)
    .slice(0, 8)
    .map((a) => ({ name: a.name, komisyon: a.w_commission, oyuncu: a.total_players }));

  const totals = affiliates.reduce(
    (acc, a) => {
      acc.commission += a.w_commission;
      acc.players += a.total_players;
      acc.clicks += a.total_clicks;
      return acc;
    },
    { commission: 0, players: 0, clicks: 0 }
  );

  return (
    <Layout title="Raporlar">
      <div className="page-head">
        <div>
          <div className="section-title">Raporlar</div>
          <div className="section-sub">Affiliate performans özeti</div>
        </div>
      </div>

      {loading || !dash ? (
        <div className="spinner" style={{ margin: "40px auto" }} />
      ) : (
        <>
          <div className="grid grid-4" style={{ marginBottom: 18 }}>
            <div className="stat hero"><div className="stat-label">Toplam Komisyon</div><div className="stat-value">{money(totals.commission)}</div></div>
            <div className="stat"><div className="stat-label">Toplam Oyuncu</div><div className="stat-value">{num(totals.players)}</div></div>
            <div className="stat"><div className="stat-label">Toplam Tıklama</div><div className="stat-value">{num(totals.clicks)}</div></div>
            <div className="stat accent"><div className="stat-label">Dönüşüm Oranı</div><div className="stat-value">{pct(totals.clicks ? (totals.players / totals.clicks) * 100 : 0)}</div></div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-head"><div className="card-title">En İyi Affiliateler (Komisyon)</div></div>
            <div className="card-body" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#8591ab" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#8591ab" }} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Bar dataKey="komisyon" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-head"><div className="card-title">Detaylı Performans</div></div>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Affiliate</th><th>BTag</th><th>Tıklama</th><th>Oyuncu</th><th>Komisyon Oranı</th><th>Kazanılan Komisyon</th><th>Alt Btag</th></tr>
                </thead>
                <tbody>
                  {affiliates.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.name}</td>
                      <td><span className="chip">{a.btag}</span></td>
                      <td>{num(a.total_clicks)}</td>
                      <td><span className="badge blue">{num(a.total_players)}</span></td>
                      <td>{pct(a.commission_rate)}</td>
                      <td className="pos">{money(a.w_commission)}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => openSubReport(a)}>Görüntüle</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {sub && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">Alt Btag Kırılımı — {sub.affiliate?.name}</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSub(null)}>Kapat</button>
              </div>
              {subLoading || sub.loading ? (
                <div className="card-body"><div className="spinner" style={{ margin: "20px auto" }} /></div>
              ) : (
                <div className="table-wrap">
                  <table className="tbl">
                    <thead>
                      <tr><th>BTag</th><th>Etiket</th><th>Oyuncu</th><th>Yatırım</th><th>Çekim</th><th>Net</th><th>Komisyon</th></tr>
                    </thead>
                    <tbody>
                      {sub.rows?.map((r) => (
                        <tr key={r.btag}>
                          <td><span className="chip">{r.btag}</span> {r.is_main && <span className="badge purple" style={{ fontSize: 10 }}>ana</span>}</td>
                          <td className="muted">{r.label}</td>
                          <td><span className="badge blue">{num(r.players)}</span></td>
                          <td className="pos">{money(r.deposit)}</td>
                          <td className="neg">{money(r.withdrawal)}</td>
                          <td className={r.net >= 0 ? "pos" : "neg"}>{money(r.net)}</td>
                          <td className="pos">{money(r.commission)}</td>
                        </tr>
                      ))}
                      {sub.totals && (
                        <tr className="totals-row">
                          <td colSpan={2}>Toplam</td>
                          <td>{num(sub.totals.players)}</td>
                          <td>{money(sub.totals.deposit)}</td>
                          <td>{money(sub.totals.withdrawal)}</td>
                          <td>{money(sub.totals.net)}</td>
                          <td>{money(sub.totals.commission)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
