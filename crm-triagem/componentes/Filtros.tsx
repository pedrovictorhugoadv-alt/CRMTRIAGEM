import { STATUS } from "@/lib/regua";

export default function Filtros({ busca, status, acao }: { busca?: string; status?: string; acao: string }) {
  return (
    <form className="barra-topo" action={acao}>
      <input type="search" name="busca" placeholder="Buscar por cliente, CPF, processo…" defaultValue={busca ?? ""} />
      <select name="status" defaultValue={status ?? ""}>
        <option value="">Todos os status</option>
        {Object.entries(STATUS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <button className="btn ghost sm" type="submit">Filtrar</button>
    </form>
  );
}
