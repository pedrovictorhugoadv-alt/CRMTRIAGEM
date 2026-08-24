"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SUPERVISOR = [
  { href: "/painel", texto: "Painel" },
  { href: "/entregas", texto: "Entregas" },
  { href: "/todas", texto: "Todas" },
  { href: "/", texto: "Minha fila" },
  { href: "/equipe", texto: "Equipe" },
];

const COBRADOR = [
  { href: "/", texto: "Minha fila" },
  { href: "/progresso", texto: "Meu progresso" },
];

export default function Abas({ papel, aguardando }: { papel: string; aguardando: number }) {
  const atual = usePathname();
  const abas = papel === "supervisor" ? SUPERVISOR : COBRADOR;

  return (
    <nav className="abas">
      {abas.map((a) => (
        <Link key={a.href} href={a.href} aria-current={atual === a.href ? "page" : undefined}>
          {a.texto}
          {a.href === "/entregas" && aguardando > 0 ? (
            <span className="aviso-badge">{aguardando}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
