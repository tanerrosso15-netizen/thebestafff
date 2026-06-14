export function money(value, currency = "\u20ba") {
  const n = Number(value || 0);
  return (
    currency +
    n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

export function num(value) {
  return Number(value || 0).toLocaleString("tr-TR");
}

export function pct(value) {
  return `%${Number(value || 0).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}

export function dateFmt(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d)) return "-";
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateShort(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("tr-TR");
}

export function timeAgo(value) {
  if (!value) return "-";
  const d = new Date(value);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff} sn önce`;
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}
