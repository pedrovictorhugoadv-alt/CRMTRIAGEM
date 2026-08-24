export default function Kpi({
  tom, rotulo, valor, pe,
}: { tom?: "crit" | "warn" | "bom"; rotulo: string; valor: number; pe: string }) {
  return (
    <div className={`kpi ${tom ?? ""}`}>
      <div className="rot">{rotulo}</div>
      <div className="num">{valor}</div>
      <div className="pe">{pe}</div>
    </div>
  );
}
