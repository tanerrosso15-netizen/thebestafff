import { useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import { Icon } from "../components/Icons";
import api, { apiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

function timeFmt(s) {
  try {
    return new Date(s).toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

export default function Messages() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);
  const fileRef = useRef(null);

  async function loadThreads() {
    const r = await api.get("/api/messages/threads");
    setThreads(r.data);
    if (r.data.length && active == null) setActive(r.data[0].affiliate_id);
  }

  async function loadMsgs(affId) {
    if (affId == null) return;
    const r = await api.get("/api/messages", { params: { affiliate_id: affId } });
    setMsgs(r.data);
  }

  useEffect(() => { loadThreads(); }, []);
  useEffect(() => { if (active != null) loadMsgs(active); }, [active]);

  useEffect(() => {
    if (active == null) return;
    const t = setInterval(() => loadMsgs(active), 5000);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs]);

  async function send() {
    if (!text.trim() && !file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      if (isAdmin) fd.append("affiliate_id", active);
      fd.append("body", text);
      if (file) fd.append("image", file);
      await api.post("/api/messages", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setText(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadMsgs(active);
      loadThreads();
    } catch (ex) {
      toast.error(apiError(ex));
    } finally {
      setBusy(false);
    }
  }

  const activeThread = threads.find((t) => t.affiliate_id === active);

  return (
    <Layout title={isAdmin ? "Mesajlar" : "Canlı Destek"}>
      <div className="page-head">
        <div>
          <div className="section-title">{isAdmin ? "Mesajlar" : "Canlı Destek"}</div>
          <div className="section-sub">
            {isAdmin ? "Affiliatelerle birebir iletişim ve sorun çözümü" : "Yönetim ekibiyle anlık iletişim kurun"}
          </div>
        </div>
      </div>

      <div className="chat-shell">
        {isAdmin && (
          <div className="chat-list">
            {threads.length === 0 ? (
              <div className="chat-empty">Henüz konuşma yok</div>
            ) : (
              threads.map((t) => (
                <div
                  key={t.affiliate_id}
                  className={`chat-list-item ${active === t.affiliate_id ? "active" : ""}`}
                  onClick={() => setActive(t.affiliate_id)}
                >
                  <div className="chat-ava">{(t.affiliate_name || "?").charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, display: "flex", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.affiliate_name}</span>
                      {t.unread > 0 && <span className="badge red" style={{ fontSize: 10 }}>{t.unread}</span>}
                    </div>
                    <div className="muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.last_message || `btag: ${t.btag}`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="chat-main" style={!isAdmin ? { gridColumn: "1 / -1" } : undefined}>
          {active == null ? (
            <div className="chat-empty">Bir konuşma seçin</div>
          ) : (
            <>
              <div className="chat-head">
                <div className="chat-ava">{(activeThread?.affiliate_name || "?").charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{isAdmin ? activeThread?.affiliate_name : "Destek"}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{activeThread?.btag ? `btag: ${activeThread.btag}` : "çevrimiçi"}</div>
                </div>
              </div>
              <div className="chat-body" ref={bodyRef}>
                {msgs.length === 0 ? (
                  <div className="chat-empty">Henüz mesaj yok — ilk mesajı gönderin</div>
                ) : (
                  msgs.map((m) => {
                    const mine = isAdmin ? m.sender_role !== "affiliate" : m.sender_role === "affiliate";
                    return (
                      <div key={m.id} className={`msg ${mine ? "out" : "in"}`}>
                        {m.body && <div>{m.body}</div>}
                        {m.image_path && (
                          <img src={m.image_path} alt="ek" onClick={() => window.open(m.image_path, "_blank")} />
                        )}
                        <div className="msg-time">{!mine && `${m.sender_name} · `}{timeFmt(m.created_at)}</div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="chat-input">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <button className="btn btn-ghost btn-icon" onClick={() => fileRef.current?.click()} title="Resim ekle">
                  <Icon.image width={18} height={18} />
                </button>
                <input
                  type="text"
                  placeholder={file ? `📎 ${file.name}` : "Mesaj yazın..."}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !busy && send()}
                />
                <button className="btn btn-primary btn-icon" onClick={send} disabled={busy || (!text.trim() && !file)} title="Gönder">
                  <Icon.send width={18} height={18} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
