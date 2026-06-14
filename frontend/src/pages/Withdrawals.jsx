import { useEffect, useState } from "react";

import Layout from "../components/Layout";

import api, { apiError } from "../api/client";

import { useAuth } from "../context/AuthContext";

import { useToast } from "../context/ToastContext";

import { dateFmt, money } from "../utils/format";



const STATUS = {

  pending: { label: "Bekliyor", cls: "amber" },

  approved: { label: "Onaylandı", cls: "green" },

  rejected: { label: "Reddedildi", cls: "red" },

};



function SoonCard() {

  return (

    <div className="soon-card" style={{ maxWidth: 560, margin: "40px auto" }}>

      <div className="soon-emoji">🚀</div>

      <div className="soon-pill">YAKINDA</div>

      <h2>Çekim Yönetimi Geliştiriliyor</h2>

      <p>

        Otomatik çekim onayı, anlık bildirimler ve gelişmiş risk analizi içeren

        yeni nesil çekim yönetimi modülü çok yakında burada olacak. Oyuncu

        taleplerini tek tıkla yönetebilecek, ödemeleri saniyeler içinde

        sonuçlandırabileceksiniz. Hazır olun! ⚡

      </p>

    </div>

  );

}



export default function Withdrawals() {

  const { isAdmin } = useAuth();

  const toast = useToast();

  const [rows, setRows] = useState([]);

  const [filter, setFilter] = useState("");

  const [loading, setLoading] = useState(true);



  async function load() {

    setLoading(true);

    try {

      const params = filter ? { status: filter } : {};

      const r = await api.get("/api/withdrawals", { params });

      setRows(r.data);

    } finally {

      setLoading(false);

    }

  }

  useEffect(() => { if (isAdmin) load(); else setLoading(false); }, [filter, isAdmin]);



  async function setStatus(wd, status) {

    try {

      await api.put(`/api/withdrawals/${wd.id}`, { status });

      toast.success("Güncellendi.");

      load();

    } catch (ex) { toast.error(apiError(ex)); }

  }



  // Affiliate personeli: yalnızca Soon ekranı

  if (!isAdmin) {

    return (

      <Layout title="Çekim İstekleri">

        <div className="page-head">

          <div>

            <div className="section-title">Çekim İstekleri</div>

            <div className="section-sub">Yakında aktif olacak</div>

          </div>

        </div>

        <SoonCard />

      </Layout>

    );

  }



  return (

    <Layout title="Çekim İstekleri">

      <div className="page-head">

        <div>

          <div className="section-title">Çekim İstekleri</div>

          <div className="section-sub">Oyuncu çekim taleplerini yönetin</div>

        </div>

        <div className="btn-row">

          {["", "pending", "approved", "rejected"].map((s) => (

            <button key={s} className={`btn btn-sm ${filter === s ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilter(s)}>

              {s === "" ? "Tümü" : STATUS[s].label}

            </button>

          ))}

        </div>

      </div>



      <div className="soon-wrap">

        <div className="soon-overlay">

          <SoonCard />

        </div>

        <div className="soon-blur card">

        <div className="table-wrap">

          <table className="tbl">

            <thead>

              <tr>

                <th>Oyuncu</th><th>Oyuncu ID</th><th>BTag</th><th>Tutar</th>

                <th>Yöntem</th><th>Durum</th><th>Talep Tarihi</th><th>İşlem</th>

              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr><td colSpan={8}><div className="empty"><div className="spinner" style={{ margin: "0 auto" }} /></div></td></tr>

              ) : rows.length === 0 ? (

                <tr><td colSpan={8}><div className="empty"><div className="emoji">💸</div>Çekim isteği yok</div></td></tr>

              ) : (

                rows.map((w) => (

                  <tr key={w.id}>

                    <td style={{ fontWeight: 600 }}>{w.player_name || "-"}</td>

                    <td><span className="chip">{w.player_external_id || "-"}</span></td>

                    <td>{w.btag ? <span className="chip">{w.btag}</span> : "-"}</td>

                    <td className="neg">{money(w.amount)}</td>

                    <td className="muted">{w.method || "-"}</td>

                    <td><span className={`badge ${STATUS[w.status]?.cls || "gray"}`}>{STATUS[w.status]?.label || w.status}</span></td>

                    <td className="muted">{dateFmt(w.requested_at)}</td>

                    <td>

                      {w.status === "pending" ? (

                        <div className="btn-row">

                          <button className="btn btn-sm" style={{ background: "rgba(16,185,129,0.15)", color: "var(--accent)" }} onClick={() => setStatus(w, "approved")}>Onayla</button>

                          <button className="btn btn-danger btn-sm" onClick={() => setStatus(w, "rejected")}>Reddet</button>

                        </div>

                      ) : (

                        <span className="muted">{dateFmt(w.resolved_at)}</span>

                      )}

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

        </div>

      </div>

    </Layout>

  );

}


