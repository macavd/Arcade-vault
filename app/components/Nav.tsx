"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "./SessionProvider";

const LINKS = [
  { href: "/", label: "Inicio", match: (p: string) => p === "/" },
  { href: "/games", label: "Biblioteca", match: (p: string) => p === "/games" || p.startsWith("/juego") },
  { href: "/salon", label: "Salón de la Fama", match: (p: string) => p.startsWith("/salon") },
] as const;

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useSession();
  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>

        <div className="links">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={l.match(pathname) ? "active" : ""}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="spacer" />

        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>

        {user ? (
          <button
            className="btn ghost auth-btn"
            onClick={() => {
              close();
              signOut();
            }}
          >
            {user.name} ▾
          </button>
        ) : (
          <Link href="/auth" className="btn auth-btn" onClick={close}>
            Iniciar Sesión
          </Link>
        )}

        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      />
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={l.match(pathname) ? "active" : ""}
            onClick={close}
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/auth"
          className={pathname.startsWith("/auth") ? "active" : ""}
          onClick={close}
        >
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }} />
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
