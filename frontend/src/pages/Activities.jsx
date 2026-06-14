import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Icon } from "../components/Icons";
import api from "../api/client";
import { timeAgo, dateFmt } from "../utils/format";

const TYPE_CLS = {
  sync: "blue", affiliate: "purple", login: "gray", deposit: "green",
  withdrawal: "amber", register: "blue", info: "gray",
};

export default function Activities() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get("/api/activities", { params: { limit: 100 } });
      setRows(r.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <Layout title="Aktiviteler">
      <div className="page-head">
        <div>
          <div className="section-title">Aktiviteler</div>
          <div className="section-sub">Son sistem ve affiliate hareketleri</div>
        </div>
        <button className="btn btn-ghost" onClick={load}><Icon.refresh width={16} height={16} /> Yenile</button>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="spinner" style={{ margin: "20px auto" }} />
          ) : rows.length === 0 ? (
            <div className="empty"><div className="emoji">📋</div>Aktivite yok</div>
          ) : (
            rows.map((a) => (
              <div className="top-aff-item" key={a.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div className="top-aff-rank" style={{ background: "var(--panel-soft)" }}>
                    <Icon.activity width={15} height={15} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{a.title || a.type}</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                      {a.description} {a.actor && `· ${a.actor}`}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className={`badge ${TYPE_CLS[a.type] || "gray"}`}>{a.type}</span>
                  <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 5 }} title={dateFmt(a.created_at)}>
                    {timeAgo(a.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
