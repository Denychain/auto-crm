"use client";

import { useEffect, useRef, useState } from "react";
import { CONTACTS } from "@/lib/constants";

/* ── helpers ─────────────────────────────────────────── */
function fmtBytes(b: number) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

const DAYS = [
  { name: "НД", h: CONTACTS.hours.sunday,   closed: true  },
  { name: "ПН", h: CONTACTS.hours.weekdays,  closed: false },
  { name: "ВТ", h: CONTACTS.hours.weekdays,  closed: false },
  { name: "СР", h: CONTACTS.hours.weekdays,  closed: false },
  { name: "ЧТ", h: CONTACTS.hours.weekdays,  closed: false },
  { name: "ПТ", h: CONTACTS.hours.weekdays,  closed: false },
  { name: "СБ", h: CONTACTS.hours.saturday,  closed: false },
];

const FAQ = [
  {
    q: "Чи потрібен попередній запис?",
    a: "Рекомендуємо подзвонити або написати наперед — особливо якщо потрібна оцінка кількох елементів. Без запису теж приймаємо, але черга є чергою.",
  },
  {
    q: "Скільки часу займає ремонт?",
    a: "Залежить від обсягу: локальний дефект — 1–2 дні, крило або двері — 3–5 днів, складний проєкт — до 2–3 тижнів. Точні строки називаємо після огляду.",
  },
  {
    q: "Чи є гарантія на роботу?",
    a: "Так. Гарантуємо якість лакофарбового покриття та кузовних робіт. Умови обговорюємо при укладенні угоди — нічого прихованого.",
  },
  {
    q: "Яким чином підбирається фарба?",
    a: "Використовуємо спектрофотометр для точного зчитування коду та ручне доведення колориста. Підбір «плямою» — наша спеціалізація.",
  },
  {
    q: "Чи можна залишити авто і приїхати потім?",
    a: "Так, саме так і робить більшість клієнтів. Ми повідомимо, коли авто буде готове. Статус можна відстежувати онлайн за посиланням.",
  },
];

/* ── component ───────────────────────────────────────── */
export default function ContactsPage() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [isOpen,   setIsOpen]     = useState(false);
  const [today,    setToday]      = useState(-1);
  const [files,    setFiles]      = useState<File[]>([]);
  const [isDrag,   setIsDrag]     = useState(false);
  const [formSent, setFormSent]   = useState(false);
  const [openFaq,  setOpenFaq]    = useState<number | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  /* scroll → header shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* body scroll lock when mobile menu open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  /* hours open/closed + today highlight */
  useEffect(() => {
    const now = new Date();
    const d   = now.getDay();   // 0=Sun … 6=Sat
    const hh  = now.getHours();
    const open =
      (d >= 1 && d <= 5 && hh >= 9 && hh < 18) ||
      (d === 6 && hh >= 9 && hh < 14);
    setIsOpen(open);
    setToday(d);
  }, []);

  /* drag-and-drop */
  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    setFiles(prev => {
      const next = [...prev];
      for (let i = 0; i < incoming.length; i++) {
        if (next.length >= 5) break;
        next.push(incoming[i]);
      }
      return next;
    });
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setIsDrag(true); }
  function handleDragLeave()                   { setIsDrag(false); }
  function handleDrop(e: React.DragEvent)      { e.preventDefault(); setIsDrag(false); addFiles(e.dataTransfer.files); }
  function removeFile(i: number)               { setFiles(f => f.filter((_, idx) => idx !== i)); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormSent(true);
  }

  return (
    <>
      {/* ══ HEADER ══════════════════════════════════════ */}
      <header className={`site-header${scrolled ? " is-scrolled" : ""}`} id="header">
        <div className="container">
          <a href="/" className="logo" aria-label="NICE.car.if">
            <span>nice</span><span className="dot">.</span><span>car</span><span className="dot">.</span><span className="accent">if</span>
          </a>

          <nav className="nav" aria-label="Головна навігація">
            <a href="/">Головна</a>
            <a href="/#us-cars">Авто з США</a>
            <a href="/gallery">Галерея</a>
            <a href="/#about-master">Про майстра</a>
            <a href="/contacts" className="active">Контакти</a>
          </nav>

          <span className="header-divider" aria-hidden={true}></span>

          <a href={`tel:${CONTACTS.phone}`} className="phone">
            <span className="pulse" aria-hidden={true}></span>
            +380 99 233 44 20
          </a>

          <button className="burger" onClick={() => setMenuOpen(m => !m)} aria-expanded={menuOpen} aria-label="Меню">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="square">
              <path d="M3 7h18M3 12h18M3 17h18"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ══ MOBILE MENU ══════════════════════════════════ */}
      <div className={`mobile-menu${menuOpen ? " is-open" : ""}`} aria-hidden={!menuOpen}>
        <a href="/" onClick={() => setMenuOpen(false)}><span>Головна</span><span className="num">01 / 05</span></a>
        <a href="/#us-cars" onClick={() => setMenuOpen(false)}><span>Авто з США</span><span className="num">02 / 05</span></a>
        <a href="/gallery" onClick={() => setMenuOpen(false)}><span>Галерея</span><span className="num">03 / 05</span></a>
        <a href="/#about-master" onClick={() => setMenuOpen(false)}><span>Про майстра</span><span className="num">04 / 05</span></a>
        <a href="/contacts" onClick={() => setMenuOpen(false)}><span>Контакти</span><span className="num">05 / 05</span></a>
        <a href={`tel:${CONTACTS.phone}`} className="m-phone" onClick={() => setMenuOpen(false)}>
          <small>Подзвонити Майстру Дмитру</small>
          +380 99 233 44 20
        </a>
      </div>

      {/* ══ PAGE HEAD ════════════════════════════════════ */}
      <section className="page-head">
        <div className="container">

          {/* breadcrumb */}
          <nav className="breadcrumb" aria-label="Навігаційні крихти">
            <a href="/">NICE.car.if</a>
            <span aria-hidden>›</span>
            <span className="cur">Контакти</span>
          </nav>

          <div className="ph-grid">
            <div>
              <div className="eyebrow">
                <span className="bar" aria-hidden></span>
                <span className="num">// Контакти та адреса</span>
              </div>
              <h1 className="ph-title">
                <span className="thin">Знайти нас</span>
                <span>Завжди<br /><span className="accent">на зв'язку</span></span>
              </h1>
            </div>

            <div className="ph-meta">
              <p>
                Ми у <strong>центрі Івано-Франківська</strong> — легко добратись, є зручна парковка.
                Зателефонуйте або напишіть, і ми узгодимо зручний час для огляду авто.
              </p>
              <p style={{ marginTop: 14 }}>
                Середній час відповіді: <strong>до 30 хвилин</strong> в робочий час.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CONTACT BOARD ════════════════════════════════ */}
      <section className="board">
        <div className="container">
          <div className="board-grid">

            {/* LEFT — contact card */}
            <div className="contact-card">
              <div className="card-head">
                <span className="k">// Прямий зв&apos;язок</span>
                <span className={`open-badge${isOpen ? "" : " closed"}`}>
                  {isOpen ? "Зараз відкрито" : "Зараз закрито"}
                </span>
              </div>

              {/* big phone */}
              <div className="big-phone">
                <span className="lbl">Телефон / WhatsApp</span>
                <a href={`tel:${CONTACTS.phone}`}>{CONTACTS.phone}</a>
                <span className="hint">
                  Пн–Пт <em>09:00–18:00</em> · Сб <em>09:00–14:00</em> · Нд — вихідний
                </span>
              </div>

              {/* messenger row */}
              <div className="msgs">
                <a className="msg-card" href={CONTACTS.telegram} target="_blank" rel="noopener noreferrer">
                  <svg className="ico tg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  <div className="body">
                    <strong>Telegram</strong>
                    <small>Написати</small>
                  </div>
                </a>

                <a className="msg-card" href={CONTACTS.viber}>
                  <svg className="ico viber" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.4 0C6 0 3 3 3 3S0 6 0 11.4c0 4.3 2.4 8.2 6.3 10.2l-.4 2.4 2.5-1.3c1 .3 2 .4 3 .4 5.4 0 11.4-3.8 11.4-11.7C22.8 5.4 18.6 0 11.4 0zm5.2 17.2s-.4.5-1.2.5c-3.8 0-6.4-1.8-8.5-4-.8-.9-1.5-2-2-3.1-.4-.9-.4-1.4-.4-1.4 0-.8.5-1.2.5-1.2l.6-.7c.3-.3.4-.7.3-1.1l-.7-2c-.2-.5-.6-.8-1.1-.8-.9 0-1.5.7-1.5.7C1.2 4.7 2 7.3 4 9.7c2 2.4 4.5 4.3 7.3 5.3 1.3.5 2.6.7 3.8.7.8 0 1.5-.2 2.1-.5.6-.4 1-1 1-1 .5-1.1-.3-1.7-.3-1.7l-1.3-1c-.4-.3-.8-.3-1.2 0z"/>
                  </svg>
                  <div className="body">
                    <strong>Viber</strong>
                    <small>Написати</small>
                  </div>
                </a>

                <a className="msg-card" href={CONTACTS.instagram} target="_blank" rel="noopener noreferrer">
                  <svg className="ico ig" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                  </svg>
                  <div className="body">
                    <strong>Instagram</strong>
                    <small>Написати</small>
                  </div>
                </a>
              </div>

              {/* hours grid */}
              <div className="hours-grid" role="table" aria-label="Години роботи">
                {DAYS.map((day, i) => (
                  <div
                    key={i}
                    className={`day-cell${day.closed ? " closed" : ""}${today === i ? " today" : ""}`}
                    data-d={i}
                    role="cell"
                  >
                    <span className="name">{day.name}</span>
                    <span className="h">{day.closed ? "—" : day.h.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — address card */}
            <div className="address-card">
              <span className="k">// Адреса цеху</span>

              <address>
                <span className="city">Івано-Франківськ, Україна</span>
                <span className="street">{CONTACTS.address}</span>
              </address>

              <div className="addr-hint">
                <em>Орієнтир:</em> {CONTACTS.addressHint}
              </div>

              <a
                href={CONTACTS.googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                className="msg-card"
                style={{ marginTop: 4 }}
              >
                <svg className="ico ig" viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
                </svg>
                <div className="body">
                  <strong>Відкрити на Google Maps</strong>
                  <small>Прокласти маршрут</small>
                </div>
              </a>

              <div className="gps-coords">
                <span className="live">GPS</span>
                <span>48.9226° N</span>
                <span>24.7111° E</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ MAP SECTION ══════════════════════════════════ */}
      <section className="map-sec">
        <div className="container">
          <div className="map-frame" role="img" aria-label="Карта розташування NICE.car.if">

            {/* grid bg */}
            <div className="map-grid-bg" aria-hidden></div>

            {/* SVG road illustration */}
            <svg
              viewBox="0 0 1200 514"
              preserveAspectRatio="xMidYMid slice"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .55 }}
              aria-hidden
            >
              {/* main horizontal road */}
              <path d="M0 257 H1200" stroke="rgba(255,255,255,.12)" strokeWidth="40" fill="none"/>
              <path d="M0 257 H1200" stroke="rgba(255,255,255,.04)" strokeWidth="42" fill="none"/>
              <line x1="0" y1="257" x2="1200" y2="257" stroke="rgba(255,87,34,.15)" strokeWidth="1" strokeDasharray="12 18"/>
              {/* vertical cross-road */}
              <path d="M600 0 V514" stroke="rgba(255,255,255,.08)" strokeWidth="32" fill="none"/>
              {/* diagonal bypass road */}
              <path d="M0 450 Q300 257 600 257 Q900 257 1200 60" stroke="rgba(255,255,255,.06)" strokeWidth="22" fill="none"/>
              {/* accent ring */}
              <circle cx="600" cy="257" r="90" stroke="rgba(255,87,34,.12)" strokeWidth="1" fill="none" strokeDasharray="8 14"/>
              <circle cx="600" cy="257" r="140" stroke="rgba(255,87,34,.06)" strokeWidth="1" fill="none"/>
              {/* OKKO petrol station marker */}
              <rect x="680" y="170" width="48" height="32" rx="2" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.1)" strokeWidth="1"/>
              <text x="704" y="191" textAnchor="middle" fill="rgba(255,255,255,.25)" fontSize="9" fontFamily="monospace">ОККО</text>
            </svg>

            {/* overlay label */}
            <div className="map-overlay" aria-hidden>
              <span>Цех · <strong>вул. Максимовича, 15</strong></span>
            </div>

            {/* zoom controls (decorative) */}
            <div className="map-zoom" aria-hidden>
              <button type="button" aria-label="Збільшити">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14"/></svg>
              </button>
              <button type="button" aria-label="Зменшити">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14"/></svg>
              </button>
            </div>

            {/* pin */}
            <div className="map-pin" aria-hidden>
              <div className="dot"></div>
              <div className="halo"></div>
              <div className="label">
                <span>NICE.car.if</span>
                <span className="v">Кузовний цех</span>
              </div>
            </div>

            {/* coordinates overlay */}
            <div className="map-coords" aria-hidden>
              <span className="live">GPS</span>
              <span>48.9226° N · 24.7111° E</span>
            </div>

            {/* action buttons */}
            <div className="map-actions">
              <a
                href={CONTACTS.googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-sm primary"
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                Google Maps
              </a>
              <a
                href="https://waze.com/ul?ll=48.9226,24.7111&navigate=yes"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-sm"
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 6.63C18.95 4.02 16.15 2.25 13 2.03c-.33-.02-.67-.03-1-.03C6.48 2 2 6.48 2 12c0 2.4.85 4.6 2.26 6.33L3 21l2.82-1.21A9.943 9.943 0 0 0 12 22c.33 0 .67-.02 1-.05 4.25-.4 7.76-3.3 9.02-7.24.41-1.26.6-2.59.52-3.97-.07-1.48-.48-2.9-1-4.11zM12 20c-1.64 0-3.16-.5-4.42-1.34l-.29-.2-2.56 1.09.94-2.59-.2-.31A8 8 0 1 1 20 12c0 4.42-3.58 8-8 8zm4.16-6.12c-.22-.11-1.32-.65-1.53-.73-.2-.07-.35-.11-.5.11s-.57.73-.7.88c-.13.15-.26.17-.48.06-.22-.11-.93-.34-1.77-1.09-.65-.58-1.09-1.3-1.22-1.52-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.06-.11-.5-1.2-.68-1.64-.18-.43-.37-.37-.5-.38h-.43c-.15 0-.39.06-.59.28-.2.22-.78.76-.78 1.86s.8 2.16.91 2.31c.11.15 1.58 2.41 3.83 3.38.54.23.96.37 1.28.47.54.17 1.03.15 1.42.09.43-.07 1.32-.54 1.51-1.06.19-.52.19-.97.13-1.06-.06-.09-.2-.15-.43-.26z"/></svg>
                Waze
              </a>
              <a
                href="https://maps.apple.com/?q=48.9226,24.7111"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-sm"
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.15 1.26-2.13 3.76.03 2.99 2.6 3.98 2.63 3.99-.03.07-.41 1.41-1.35 2.87M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                Apple Maps
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ RULES SECTION ════════════════════════════════ */}
      <section className="sec sec--dark">
        <div className="container">
          <div className="sec-head">
            <h2 className="sec-title">
              Як ми<br /><span className="accent">працюємо</span>
            </h2>
            <p className="sec-intro">
              Три принципи, які визначають кожен проєкт у нашому цеху.
              <strong> Жодних сюрпризів</strong> — тільки результат.
            </p>
          </div>

          <div className="rules-grid">
            <div className="rule">
              <span className="num">01</span>
              <span className="tag">// Оцінка</span>
              <h3>Прозора вартість</h3>
              <p>
                Ціна узгоджується <strong>до початку</strong> робіт і не змінюється без вашого відома.
                Якщо виявлено прихований дефект — завжди дзвонимо і погоджуємо.
              </p>
            </div>

            <div className="rule">
              <span className="num">02</span>
              <span className="tag">// Процес</span>
              <h3>Контроль на кожному етапі</h3>
              <p>
                Ви можете відстежувати статус авто онлайн або телефонувати у будь-який час.
                <em> Ніяких «зателефонуємо самі»</em> без конкретики.
              </p>
            </div>

            <div className="rule">
              <span className="num">03</span>
              <span className="tag">// Результат</span>
              <h3>Гарантія на роботу</h3>
              <p>
                Гарантуємо якість покриття та кузовних робіт письмово.
                Підбір фарби виконується <strong>спектрофотометром</strong> — колір у колір.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ ESTIMATE FORM ════════════════════════════════ */}
      <section className="sec">
        <div className="container">
          <div className="sec-head">
            <div>
              <div className="eyebrow">
                <span className="bar" aria-hidden></span>
                <span className="num">// Хочете точну цифру?</span>
              </div>
              <h2 className="sec-title">
                Залиште<br /><span className="accent">заявку</span>
              </h2>
            </div>
            <p className="sec-intro">
              Опишіть пошкодження і прикріпіть фото — відповімо з орієнтовною вартістю протягом кількох годин.
              <strong> Без зобов'язань.</strong>
            </p>
          </div>

          <div className="form-block">
            {/* FORM CARD */}
            <div className="form-card">
              <span className="lbl">// Форма заявки</span>
              <h3>Розрахувати <span className="accent">вартість ремонту</span></h3>

              {formSent ? (
                <div className="form-status is-visible">
                  ✓ Заявку отримано — відповімо протягом кількох годин. Дякуємо!
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <div className="field-row">
                    <div className="field">
                      <label htmlFor="f-name">Ваше ім&apos;я</label>
                      <input id="f-name" type="text" placeholder="Олексій" required />
                    </div>
                    <div className="field">
                      <label htmlFor="f-phone">Номер телефону</label>
                      <input id="f-phone" type="tel" placeholder="+380 __  ___  __ __" required />
                    </div>
                  </div>

                  <div className="field" style={{ marginTop: 14 }}>
                    <label htmlFor="f-car">Автомобіль</label>
                    <input id="f-car" type="text" placeholder="Toyota Camry 2021" />
                  </div>

                  <div className="field" style={{ marginTop: 14 }}>
                    <label htmlFor="f-damage">Опис пошкоджень</label>
                    <textarea id="f-damage" placeholder="Опишіть, що трапилось і які елементи пошкоджено…" rows={4}></textarea>
                  </div>

                  {/* dropzone */}
                  <div
                    ref={dropRef}
                    className={`dropzone${isDrag ? " is-drag" : ""}`}
                    style={{ marginTop: 14 }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => dropRef.current?.querySelector("input")?.click()}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <span className="dz-title">Завантажити фото</span>
                    <span className="dz-hint">
                      Перетягніть або клікніть · <em>до 5 файлів</em> · jpg, png, heic
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={e => { addFiles(e.target.files); e.target.value = ""; }}
                      onClick={e => e.stopPropagation()}
                      aria-label="Завантажити фото пошкодженого авто"
                    />
                  </div>

                  {files.length > 0 && (
                    <div className="file-chips">
                      {files.map((f, i) => (
                        <span key={i} className="file-chip">
                          <span className="name">{f.name}</span>
                          <span className="sz">{fmtBytes(f.size)}</span>
                          <button
                            type="button"
                            className="rm"
                            aria-label={`Видалити ${f.name}`}
                            onClick={() => removeFile(i)}
                          >×</button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="submit-row">
                    <p className="terms">
                      Натискаючи «Надіслати», ви погоджуєтесь з умовами обробки
                      <em> персональних даних</em>.
                    </p>
                    <button
                      type="submit"
                      className="btn"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 10,
                        padding: "14px 28px", background: "var(--accent)", color: "#0a0a0a",
                        fontWeight: 700, fontSize: 14, letterSpacing: ".04em",
                        clipPath: "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
                        border: "none", cursor: "pointer", transition: "background .15s ease",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Надіслати заявку
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* ALT CONTACT */}
            <div className="alt-contact">
              <span className="ac-lbl">// Прямий зв&apos;язок</span>
              <h3>Не хочете <span className="accent">форму?</span></h3>
              <p className="ac-body">
                Просто подзвоніть або напишіть напряму — <strong>Майстер Дмитро</strong> відповість
                особисто і проконсультує безкоштовно.
              </p>

              <div className="opts">
                <a href={`tel:${CONTACTS.phone}`}>
                  <svg className="ico phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z"/>
                  </svg>
                  <div className="body">
                    <strong>+380 99 233 44 20</strong>
                    <small>Дзвінок · Пн–Пт 09–18</small>
                  </div>
                  <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </a>

                <a href={CONTACTS.telegram} target="_blank" rel="noopener noreferrer">
                  <svg className="ico tg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  <div className="body">
                    <strong>Telegram</strong>
                    <small>Відповідаємо швидко</small>
                  </div>
                  <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </a>

                <a href={CONTACTS.viber}>
                  <svg className="ico viber" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.4 0C6 0 3 3 3 3S0 6 0 11.4c0 4.3 2.4 8.2 6.3 10.2l-.4 2.4 2.5-1.3c1 .3 2 .4 3 .4 5.4 0 11.4-3.8 11.4-11.7C22.8 5.4 18.6 0 11.4 0zm5.2 17.2s-.4.5-1.2.5c-3.8 0-6.4-1.8-8.5-4-.8-.9-1.5-2-2-3.1-.4-.9-.4-1.4-.4-1.4 0-.8.5-1.2.5-1.2l.6-.7c.3-.3.4-.7.3-1.1l-.7-2c-.2-.5-.6-.8-1.1-.8-.9 0-1.5.7-1.5.7C1.2 4.7 2 7.3 4 9.7c2 2.4 4.5 4.3 7.3 5.3 1.3.5 2.6.7 3.8.7.8 0 1.5-.2 2.1-.5.6-.4 1-1 1-1 .5-1.1-.3-1.7-.3-1.7l-1.3-1c-.4-.3-.8-.3-1.2 0z"/>
                  </svg>
                  <div className="body">
                    <strong>Viber</strong>
                    <small>Написати повідомлення</small>
                  </div>
                  <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FAQ ══════════════════════════════════════════ */}
      <section className="sec sec--dark">
        <div className="container">
          <div className="sec-head">
            <div>
              <div className="eyebrow">
                <span className="bar" aria-hidden></span>
                <span className="num">// Не знайшли відповідь?</span>
              </div>
              <h2 className="sec-title">
                Питання<br /><span className="accent">&amp; відповіді</span>
              </h2>
            </div>
            <p className="sec-intro">
              Найпоширеніші запитання від наших клієнтів.
              Якщо не знайшли відповідь — <strong>просто зателефонуйте</strong>.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {FAQ.map((item, i) => (
              <div
                key={i}
                style={{
                  background: openFaq === i ? "#131110" : "#0e0e0e",
                  border: "1px solid var(--line)",
                  borderColor: openFaq === i ? "rgba(255,87,34,.3)" : "var(--line)",
                  transition: "border-color .2s ease, background .2s ease",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: 16,
                    padding: "20px 24px", textAlign: "left",
                    fontFamily: "var(--font-text)", fontSize: 16,
                    fontWeight: 600, color: "var(--ink-0)",
                  }}
                >
                  <span>{item.q}</span>
                  <svg
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
                    style={{
                      width: 18, height: 18, flexShrink: 0, color: "var(--accent)",
                      transform: openFaq === i ? "rotate(45deg)" : "none",
                      transition: "transform .2s ease",
                    }}
                  >
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 24px 22px", fontSize: 15, lineHeight: 1.65, color: "var(--ink-2)" }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ MINI FOOTER ══════════════════════════════════ */}
      <footer
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
                <li><a href="/#us-cars">Авто з США</a></li>
                <li><a href="/gallery">Галерея</a></li>
                <li><a href="/#about-master">Про майстра</a></li>
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                </a>
                <a href={CONTACTS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ color: "var(--accent)", transition: "opacity .15s ease" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
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
    </>
  );
}
