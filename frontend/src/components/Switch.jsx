export default function Switch({ on, onClick }) {
  return <button className={`switch ${on ? "on" : ""}`} onClick={onClick} type="button" />;
}
