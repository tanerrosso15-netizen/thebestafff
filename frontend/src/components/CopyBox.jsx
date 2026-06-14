import { Icon } from "./Icons";
import { useToast } from "../context/ToastContext";

export default function CopyBox({ value, label }) {
  const toast = useToast();
  function copy() {
    navigator.clipboard.writeText(value);
    toast.success("Panoya kopyalandı.", label || "Kopyalandı");
  }
  return (
    <div className="copy-box">
      <span title={value}>{value}</span>
      <button className="btn btn-ghost btn-sm btn-icon" onClick={copy} title="Kopyala">
        <Icon.copy width={15} height={15} />
      </button>
    </div>
  );
}
