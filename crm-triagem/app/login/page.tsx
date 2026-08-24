import { redirect } from "next/navigation";
import { sessao } from "@/lib/auth";
import Formulario from "./formulario";

export const dynamic = "force-dynamic";

export default async function Login() {
  const s = await sessao();
  if (s) redirect(s.papel === "supervisor" ? "/painel" : "/");

  return (
    <div className="login-wrap">
      <Formulario />
    </div>
  );
}
