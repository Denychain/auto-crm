"use client";

import { useEffect, useState } from "react";
import { CONTACTS, SITE_NAV, type NavKey } from "@/lib/constants";

interface SiteHeaderProps {
  activePage: NavKey;
}

export function SiteHeader({ activePage }: SiteHeaderProps) {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen, setMenuOpen]  = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      {/* ══ HEADER ══════════════════════════════════════ */}
      <header className={`site-header${scrolled ? " is-scrolled" : ""}`} id="header">
        <div className="container">
          <a href="/" className="logo" aria-label="NICE.car.if">
            <span>nice</span><span className="dot">.</span><span>car</span><span className="dot">.</span><span className="accent">if</span>
          </a>

          <nav className="nav" aria-label="Головна навігація">
            {SITE_NAV.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={item.key === activePage ? "active" : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <span className="header-divider" aria-hidden={true}></span>

          <a href={`tel:${CONTACTS.phone}`} className="phone">
            <span className="pulse" aria-hidden={true}></span>
            +380 99 233 44 20
          </a>

          <button
            className="burger"
            onClick={() => setMenuOpen((m) => !m)}
            aria-expanded={menuOpen}
            aria-label="Меню"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="square">
              <path d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          </button>
        </div>
      </header>

      {/* ══ MOBILE MENU ══════════════════════════════════ */}
      <div className={`mobile-menu${menuOpen ? " is-open" : ""}`} aria-hidden={!menuOpen}>
        {SITE_NAV.map((item, i) => (
          <a key={item.key} href={item.href} onClick={() => setMenuOpen(false)}>
            <span>{item.label}</span>
            <span className="num">{String(i + 1).padStart(2, "0")} / {String(SITE_NAV.length).padStart(2, "0")}</span>
          </a>
        ))}
        <a href={`tel:${CONTACTS.phone}`} className="m-phone" onClick={() => setMenuOpen(false)}>
          <small>Подзвонити Майстру Дмитру</small>
          +380 99 233 44 20
        </a>
      </div>
    </>
  );
}
