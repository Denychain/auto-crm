import { CONTACTS } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer
      className="site-footer"
      style={{
        background: "#0a0a0a",
        borderTop: "1px solid var(--line)",
        padding: "clamp(48px,6vw,80px) 0 clamp(28px,3vw,40px)",
      }}
    >
      <div className="container">
        <div className="footer-grid-mini">
          {/* brand */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <a href="/" className="logo" aria-label="NICE.car.if" style={{ marginBottom: 4 }}>
              <span>nice</span><span className="dot">.</span><span>car</span><span className="dot">.</span><span className="accent">if</span>
            </a>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-3)", maxWidth: "32ch" }}>
              Кузовний ремонт та покраска автомобілів у Івано-Франківську.
            </p>
            <a href={`tel:${CONTACTS.phone}`} className="footer-phone-mini">
              +380 99 233 44 20
            </a>
          </div>

          {/* nav */}
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".22em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 16 }}>Навігація</p>
            <ul className="footer-nav-mini">
              <li><a href="/">Головна</a></li>
              <li><a href="/us-cars">Авто з США</a></li>
              <li><a href="/gallery">Галерея</a></li>
              <li><a href="/master">Про майстра</a></li>
              <li><a href="/contacts">Контакти</a></li>
            </ul>
          </div>

          {/* services */}
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".22em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 16 }}>Послуги</p>
            <ul className="footer-nav-mini">
              <li><a href="/#services">Кузовний ремонт</a></li>
              <li><a href="/#services">Фарбування</a></li>
              <li><a href="/#services">Полірування</a></li>
              <li><a href="/#services">Авто з США</a></li>
            </ul>
          </div>

          {/* contact */}
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".22em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 16 }}>Адреса</p>
            <address style={{ fontStyle: "normal", display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55 }}>
              <span>{CONTACTS.address}</span>
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                Пн–Пт {CONTACTS.hours.weekdays}<br />
                Сб {CONTACTS.hours.saturday}
              </span>
            </address>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <a href={CONTACTS.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram" style={{ color: "#5dbcf2", transition: "opacity .15s ease" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </a>
              <a href={CONTACTS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ color: "var(--accent)", transition: "opacity .15s ease" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* bottom bar */}
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".14em", color: "var(--ink-3)" }}>
            © {new Date().getFullYear()} NICE.car.if — Всі права захищені
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".14em", color: "var(--ink-3)" }}>
            ІФ · {CONTACTS.address}
          </p>
        </div>
      </div>
    </footer>
  );
}
