import Layout from "../components/Layout";

const ROLES = [
  {
    name: "Admin",
    cls: "purple",
    desc: "Tam yetki. Tüm modüllere ve sistem ayarlarına erişir, kullanıcı silebilir.",
    perms: ["Gösterge Paneli", "Affiliate yönetimi", "Gruplar", "Oyuncular", "Çekimler", "Kullanıcılar", "Sistem Ayarları", "Entegrasyon"],
  },
  {
    name: "Yönetici (Manager)",
    cls: "blue",
    desc: "Operasyonel yönetim. Kullanıcı silme ve bazı sistem işlemleri hariç çoğu modüle erişir.",
    perms: ["Gösterge Paneli", "Affiliate yönetimi", "Gruplar", "Oyuncular", "Çekimler", "Kullanıcı oluşturma"],
  },
  {
    name: "Affiliate",
    cls: "gray",
    desc: "Kendi paneli. Sadece kendi oyuncularını, alt affiliatelerini, komisyonlarını ve referans linklerini görür.",
    perms: ["Kendi Gösterge Paneli", "Referans Linklerim", "Alt Affiliatelerim", "Oyuncularım", "Çekim İstekleri"],
  },
];

export default function Permissions() {
  return (
    <Layout title="Yetkilendirme">
      <div className="page-head">
        <div>
          <div className="section-title">Yetkilendirme</div>
          <div className="section-sub">Rol bazlı erişim matrisi</div>
        </div>
      </div>

      <div className="grid grid-3">
        {ROLES.map((r) => (
          <div className="card" key={r.name}>
            <div className="card-head">
              <div className="card-title">{r.name}</div>
              <span className={`badge ${r.cls}`}>Rol</span>
            </div>
            <div className="card-body">
              <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 16 }}>{r.desc}</p>
              {r.perms.map((p) => (
                <div className="line-row" key={p}>
                  <span className="lbl">{p}</span>
                  <span className="badge green">✓</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
