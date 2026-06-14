import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Area, AreaChart, XAxis, Tooltip } from "recharts";
import Layout from "../components/Layout";
import CopyBox from "../components/CopyBox";
import { Icon } from "../components/Icons";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { money, num, pct } from "../utils/format";

function Donut({ value, label }) {
  const v = Math.max(0, Math.min(100, Number(value || 0)));
  const data = [
    { name: "a", value: v },
    { name: "b", value: 100 - v },
  ];
  return (
    <div style={{ position: "relative", width: 180, height: 180, margin: "0 auto" }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            innerRadius={66}
            outerRadius={84}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            <Cell fill="url(#grad)" />
            <Cell fill="rgba(255,255,255,0.06)" />
          </Pie>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center">
        <div>
          <div className="v">{pct(v)}</div>
          <div className="l">{label}</div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ d }) {
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="stat hero">
          <div className="stat-label">Toplam Oyuncu Bakiyesi</div>
          <div className="stat-value">{money(d.total_player_balance)}</div>
          <div className="stat-foot">{num(d.total_players)} oyuncu</div>
          <div className="stat-ico"><Icon.wallet /></div>
        </div>
        <div className="stat">
          <div className="stat-label">Toplam Yatırım</div>
          <div className="stat-value">{money(d.total_deposit)}</div>
          <div className="stat-foot">{num(d.depositing_players)} para yatıran</div>
          <div className="stat-ico"><Icon.cash /></div>
        </div>
        <div className="stat">
          <div className="stat-label">Toplam Çekim</div>
          <div className="stat-value">{money(d.total_withdrawal)}</div>
          <div className="stat-foot">Bekleyen: {num(d.pending_withdrawals)}</div>
          <div className="stat-ico"><Icon.withdraw /></div>
        </div>
        <div className="stat accent">
          <div className="stat-label">Fark (Net)</div>
          <div className="stat-value">{money(d.diff)}</div>
          <div className="stat-foot">{num(d.active_affiliates)} aktif affiliate</div>
          <div className="stat-ico"><Icon.trend /></div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr", marginBottom: 18 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">En İyi 5 Affiliate</div>
            <span className="badge purple">Komisyona göre</span>
          </div>
          <div className="card-body">
            {d.top_affiliates?.length ? (
              d.top_affiliates.map((a, i) => (
                <div className="top-aff-item" key={a.id}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div className="top-aff-rank">{i + 1}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{a.name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{a.email}</div>
                    </div>
                  </div>
                  <span className="badge green">+{money(a.amount)}</span>
                </div>
              ))
            ) : (
              <div className="empty">Veri yok</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Oyuncu Yatırım Oranı</div>
          </div>
          <div className="card-body">
            <Donut value={d.deposit_rate} label="Yatırım Oranı" />
            <div className="grid grid-2" style={{ marginTop: 18 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{num(d.total_players)}</div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Toplam Oyuncu</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{num(d.depositing_players)}</div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Para Yatıran</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="stat-label">Toplam Casino Bahisleri</div>
          <div className="stat-value" style={{ fontSize: 21 }}>{money(d.casino_bets)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Toplam Casino Kazançları</div>
          <div className="stat-value" style={{ fontSize: 21 }}>{money(d.casino_wins)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Toplam Spor Bahisleri</div>
          <div className="stat-value" style={{ fontSize: 21 }}>{money(d.sport_bets)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Toplam Spor Kazançları</div>
          <div className="stat-value" style={{ fontSize: 21 }}>{money(d.sport_wins)}</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head"><div className="card-title">Masraflar</div></div>
          <div className="card-body">
            <div className="line-row"><span className="lbl">Spor Bahisleri</span><span className="val">{money(d.expenses.sport_bets)}</span></div>
            <div className="line-row"><span className="lbl">Spor Bahis Kazançları</span><span className="val">{money(d.expenses.sport_wins)}</span></div>
            <div className="line-row"><span className="lbl">Casino Bahisleri</span><span className="val">{money(d.expenses.casino_bets)}</span></div>
            <div className="line-row"><span className="lbl">Casino Bahis Kazançları</span><span className="val">{money(d.expenses.casino_wins)}</span></div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Genel Finans</div></div>
          <div className="card-body">
            <div className="line-row"><span className="lbl">Yatırımlar</span><span className="val">{money(d.finance.deposits)}</span></div>
            <div className="line-row"><span className="lbl">Çekimler</span><span className="val">{money(d.finance.withdrawals)}</span></div>
            <div className="line-row"><span className="lbl">Fark</span><span className="val" style={{ color: d.finance.diff >= 0 ? "var(--accent)" : "var(--danger)" }}>{money(d.finance.diff)}</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

function FinanceChart({ deposit, withdrawal }) {
  const data = [
    { name: "Yatırım", v: deposit || 0 },
    { name: "Çekim", v: withdrawal || 0 },
    { name: "Net", v: Math.max(0, (deposit || 0) - (withdrawal || 0)) },
  ];
  return (
    <div style={{ height: 160, marginTop: 8 }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{ fill: "#8591ab", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#111726", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }}
            formatter={(v) => [money(v), ""]}
          />
          <Area type="monotone" dataKey="v" stroke="#06b6d4" fill="url(#depGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function AffiliateDashboard({ d }) {
  const a = d.affiliate;
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="stat-label">Toplam Yatırım</div>
          <div className="stat-value">{money(d.total_deposit)}</div>
          <div className="stat-ico"><Icon.cash /></div>
        </div>
        <div className="stat">
          <div className="stat-label">Toplam Çekim</div>
          <div className="stat-value">{money(d.total_withdrawal)}</div>
          <div className="stat-ico"><Icon.withdraw /></div>
        </div>
        <div className="stat accent">
          <div className="stat-label">Net Fark (Komisyon Tabanı)</div>
          <div className="stat-value">{money(d.net_diff)}</div>
          <div className="stat-foot">Yatırım − Çekim × {pct(a.commission_rate)}</div>
          <div className="stat-ico"><Icon.trend /></div>
        </div>
        <div className="stat hero">
          <div className="stat-label">Kazanılan Komisyon</div>
          <div className="stat-value">{money(a.w_commission)}</div>
          <div className="stat-foot">Oyuncularınızın net farkından</div>
          <div className="stat-ico"><Icon.wallet /></div>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="stat-label">Bakiye</div>
          <div className="stat-value">{money(a.balance)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Toplam Oyuncu</div>
          <div className="stat-value">{num(d.total_players)}</div>
          <div className="stat-foot">{num(d.depositing_players)} para yatıran</div>
        </div>
        <div className="stat">
          <div className="stat-label">Toplam Tıklama</div>
          <div className="stat-value">{num(a.total_clicks)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Alt Affiliate</div>
          <div className="stat-value">{num(d.sub_affiliate_count)}</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr", marginBottom: 18 }}>
        <div className="card">
          <div className="card-head"><div className="card-title">Referans Linkiniz</div><span className="badge blue">btag: {a.btag}</span></div>
          <div className="card-body">
            <p style={{ color: "var(--ink-soft)", marginBottom: 14, fontSize: 14 }}>
              Bu linki paylaşın; üzerinden gelen oyuncular size bağlanır ve komisyon kazanırsınız.
            </p>
            <CopyBox value={a.referral_link} label="Referans linki" />
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Finans Özeti</div></div>
          <div className="card-body">
            <FinanceChart deposit={d.total_deposit} withdrawal={d.total_withdrawal} />
            <div className="line-row" style={{ marginTop: 12 }}>
              <span className="lbl">Komisyon hesabı</span>
              <span className="val pos">{money(d.net_diff)} × {pct(a.commission_rate)} = {money(a.w_commission)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Alt Affiliatelerim</div></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Ad</th><th>BTag</th><th>Oyuncu</th><th>Komisyon</th></tr>
            </thead>
            <tbody>
              {d.sub_affiliates?.length ? (
                d.sub_affiliates.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td><span className="chip">{s.btag}</span></td>
                    <td>{num(s.total_players)}</td>
                    <td className="pos">{money(s.w_commission)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4}><div className="empty">Henüz alt affiliate yok</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await api.get("/api/dashboard");
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <Layout title="Gösterge Paneli">
      {loading || !data ? (
        <div style={{ padding: 60, textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto" }} />
        </div>
      ) : data.scope === "admin" ? (
        <AdminDashboard d={data} />
      ) : (
        <AffiliateDashboard d={data} />
      )}
    </Layout>
  );
}
