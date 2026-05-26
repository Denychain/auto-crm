"use client";

import { useEffect, useRef, useState } from "react";
import { CONTACTS } from "@/lib/constants";
import { QrCode } from "@/components/site/QrCode";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const wfFillRef = useRef<HTMLDivElement>(null);
  const wfSectionRef = useRef<HTMLElement>(null);
  const wfNodeRefs = useRef<HTMLSpanElement[]>([]);
  const techSectionRef = useRef<HTMLElement>(null);
  const [techVisible, setTechVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const updateWfProgress = () => {
      const section = wfSectionRef.current;
      const fill = wfFillRef.current;
      if (!section || !fill) return;
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.7;
      const end = vh * 0.3;
      const range = (r.top - end) / (start - end);
      const p = Math.max(0, Math.min(1, 1 - range));
      fill.style.width = p * 100 + "%";
      const nodes = wfNodeRefs.current;
      const activeCount = Math.round(p * nodes.length);
      nodes.forEach((n, i) => {
        if (n) n.classList.toggle("is-active", i < activeCount);
      });
    };
    window.addEventListener("scroll", updateWfProgress, { passive: true });
    window.addEventListener("resize", updateWfProgress);
    updateWfProgress();
    return () => {
      window.removeEventListener("scroll", updateWfProgress);
      window.removeEventListener("resize", updateWfProgress);
    };
  }, []);

  useEffect(() => {
    const section = techSectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setTechVisible(true);
            io.unobserve(section);
          }
        });
      },
      { threshold: 0.15 }
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      {/* HEADER */}
      <header className={`site-header${scrolled ? " is-scrolled" : ""}`} id="header">
        <div className="container">
          <a href="#" className="logo" aria-label="NICE.car.if">
            <span>nice</span><span className="dot">.</span><span>car</span><span className="dot">.</span><span className="accent">if</span>
          </a>

          <nav className="nav" aria-label="Головна навігація">
            <a href="#hero" className="active">Головна</a>
            <a href="#us-cars">Авто з США</a>
            <a href="/gallery">Галерея</a>
            <a href="#about-master">Про майстра</a>
            <a href="#contacts">Контакти</a>
          </nav>

          <span className="header-divider" aria-hidden={true}></span>

          <a href="tel:+380992334420" className="phone">
            <span className="pulse" aria-hidden={true}></span>
            +380 99 233 44 20
          </a>

          <button className="burger" onClick={() => setMenuOpen(m => !m)} aria-expanded={menuOpen} aria-label="Меню">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="square"><path d="M3 7h18M3 12h18M3 17h18"/></svg>
          </button>
        </div>
      </header>

      {/* MOBILE MENU */}
      <div className={`mobile-menu${menuOpen ? " is-open" : ""}`} aria-hidden={!menuOpen}>
        <a href="#hero" onClick={() => setMenuOpen(false)}><span>Головна</span><span className="num">01 / 05</span></a>
        <a href="#us-cars" onClick={() => setMenuOpen(false)}><span>Авто з США</span><span className="num">02 / 05</span></a>
        <a href="/gallery" onClick={() => setMenuOpen(false)}><span>Галерея</span><span className="num">03 / 05</span></a>
        <a href="#about-master" onClick={() => setMenuOpen(false)}><span>Про майстра</span><span className="num">04 / 05</span></a>
        <a href="#contacts" onClick={() => setMenuOpen(false)}><span>Контакти</span><span className="num">05 / 05</span></a>
        <a href="tel:+380992334420" className="m-phone" onClick={() => setMenuOpen(false)}>
          <small>Подзвонити майстру</small>
          +380 99 233 44 20
        </a>
      </div>

      {/* HERO */}
      <section className="hero" id="hero">
        <div className="hero-bg" aria-hidden={true}>
          <video className="hero-video" autoPlay muted loop playsInline preload="auto">
            <source src="/assets/hero-loop.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="hero-grain" aria-hidden={true}></div>
        <div className="hero-vignette" aria-hidden={true}></div>

        <span className="corner tl" aria-hidden={true}></span>
        <span className="corner tr" aria-hidden={true}></span>

        <div className="bg-slate" aria-hidden={true}>
          <span className="rec"></span>
          LIVE · NICE.car.if · цех
        </div>

        <div className="container">
          <div className="hero-inner">

            {/* LEFT: messaging */}
            <div className="hero-copy">
              <div className="hero-eyebrow">
                <span className="bar"></span>
                <span className="num">01</span>
                <span>Кузовний цех · Івано-Франківськ</span>
              </div>

              <h1 className="hero-title">
                <span className="thin">Професійний</span>
                <span className="line">Кузовний ремонт</span>
                <span className="line">В <span className="accent">Івано-Франківську</span></span>
              </h1>

              <p className="hero-sub">
                Відновлюємо авто до <strong>заводського стану</strong>. Працюємо на совість — <em>для тих, хто робить машину для себе, а не на продаж.</em>
              </p>

              <div className="usp">
                <span className="check" aria-hidden={true}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square"><path d="M5 12l5 5 9-11"/></svg>
                </span>
                <span>Власник сервісу <strong>особисто фарбує</strong> ваше авто. Не «конвеєр» — особиста відповідальність.</span>
              </div>

              <div className="cta-row">
                <a href={CONTACTS.telegram} target="_blank" rel="noopener" className="btn btn--primary" aria-label="Оцінити по фото в Telegram">
                  <svg className="ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden={true}><path d="M21.94 4.34a1.2 1.2 0 0 0-1.27-.19L3.1 11.31c-.86.35-.83 1.6.05 1.91l4.42 1.53 1.68 5.45a.9.9 0 0 0 1.51.38l2.43-2.41 4.66 3.42a1.2 1.2 0 0 0 1.88-.7l3.16-15.55a1.2 1.2 0 0 0-.45-1zM9.7 14.79l9.13-7.59-6.94 8.7-2.19 4.61z"/></svg>
                  <span>Оцінити по фото в Telegram</span>
                  <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="square"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </a>

                <a href={CONTACTS.viber} className="btn btn--ghost" aria-label="Оцінити по фото в Viber">
                  <svg className="ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden={true}><path d="M12 2C7 2 3 5 3 9.4c0 2.3 1.1 4.3 2.8 5.7l-.6 3.3c-.1.4.4.7.7.5l3-1.7c1 .3 2 .4 3.1.4 5 0 9-3 9-7.4S17 2 12 2zm-3.6 4.6c.4 0 .8.3 1 .8l.4 1c.1.4 0 .8-.3 1l-.4.3c.4 1 1.2 1.8 2.2 2.2l.3-.4c.3-.3.7-.4 1-.3l1 .4c.5.2.8.6.8 1l-.1.7c-.2.7-.9 1.2-1.7 1.2-2.6 0-5.4-2.8-5.4-5.4 0-.8.5-1.5 1.2-1.7l.7-.1z"/></svg>
                  <span>Оцінити по фото в Viber</span>
                  <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="square"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </a>
              </div>

              <div className="trust">
                <span>25 років у ремеслі</span>
                <span>Гарантія на роботу</span>
                <span>Підбір фарби 1:1</span>
              </div>
            </div>

            {/* RIGHT: technical sidebar */}
            <aside className="hero-meta" aria-label="Коротко про сервіс">
              <div className="tech-card">
                <div className="label">// Slogan</div>
                <div className="slogan">Make it <span className="accent">NICE.</span></div>
                <p className="copy">
                  Якість, яка варта очікування. Краще потримаємо машину зайвий день на сушці, ніж віддамо халтуру.
                </p>
              </div>

              <div className="spec-grid">
                <div>
                  <div className="num">25<small>років</small></div>
                  <div className="cap">Досвід<br />у ремеслі</div>
                </div>
                <div>
                  <div className="num">12<small>год</small></div>
                  <div className="cap">Сушка<br />як треба</div>
                </div>
                <div>
                  <div className="num">1:1</div>
                  <div className="cap">Підбір<br />фарби</div>
                </div>
              </div>

              <div className="file-strip">
                <span>FILE</span>
                <span>·</span>
                <span>hero_v01.section</span>
                <span className="dotline"></span>
                <span>UA</span>
              </div>
            </aside>

          </div>
        </div>

        <div className="scroll-cue" aria-hidden={true}>
          <span className="line"></span>
          <span>Скрол · далі</span>
        </div>
      </section>

      {/* 02 · ФІЛОСОФІЯ / ПРО МАЙСТРА */}
      <span id="about-master" style={{ display: "block", visibility: "hidden", height: 0 }} aria-hidden={true} />
      <section className="philosophy" id="philosophy">
        <div className="container">

          <header className="phil-head">
            <div>
              <div className="hero-eyebrow">
                <span className="bar"></span>
                <span className="num">02</span>
                <span>Філософія цеху</span>
              </div>
              <h2 className="phil-title">
                <span className="line">Працюємо на совість,</span>
                <span className="line">а не на <span className="accent">потік</span></span>
              </h2>
            </div>
            <p className="phil-sub">Ми не робимо авто «на продаж» чи «аби як». Ми відновлюємо машини для тих, хто робить для себе.</p>
          </header>

          <div className="phil-body">

            <figure className="phil-photo">
              <img src="/assets/master-paint.png" alt="Власник цеху особисто фарбує деталь під лампою" />
              <span className="tick tl" aria-hidden={true}></span>
              <span className="tick br" aria-hidden={true}></span>
              <span className="stencil" aria-hidden={true}>No<br />Rush<small>Quality First</small></span>
              <figcaption className="cap">Цех · кабіна фарбування</figcaption>
            </figure>

            <div className="phil-text">
              <p className="manifesto">
                Якщо ви шукаєте, де пофарбувати <strong>найдешевше</strong> або <strong>«на вчора»</strong> — нам не по дорозі. Ми не порушуємо технологічні процеси заради швидкості. Шпаклівка має висохнути, лак має стверднути. Ми беремо в роботу авто, власники яких цінують <strong>якість та довговічність</strong>.
              </p>

              <div className="filter-grid">
                <div className="filter filter--no">
                  <div className="filter-head"><span className="mark">×</span> Ні. Не наш клієнт</div>
                  <ul>
                    <li><q>Підфарбуйте, щоб блищало два тижні</q></li>
                    <li><q>Зробіть подешевше, це на продаж</q></li>
                  </ul>
                </div>
                <div className="filter filter--yes">
                  <div className="filter-head"><span className="mark">✓</span> Так. Наш клієнт</div>
                  <ul>
                    <li><q>Зробіть як із заводу, я буду їздити на ній 5 років</q></li>
                    <li><q>Готовий почекати заради ідеального кольору</q></li>
                  </ul>
                </div>
              </div>

              <div className="phil-foot">
                <a href="/gallery" className="btn btn--ghost">
                  <span>Дивитися приклади робіт</span>
                  <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="square"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </a>
                <span className="note">// Портфоліо робіт в цеху</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 03 · ПОСЛУГИ */}
      <section className="services" id="services">
        <div className="container">

          <header className="svc-head">
            <div>
              <div className="hero-eyebrow">
                <span className="bar"></span>
                <span className="num">03</span>
                <span>Послуги цеху</span>
              </div>
              <h2 className="svc-title">
                Що ми <span className="accent">робимо</span>
              </h2>
            </div>
            <p className="svc-intro">
              Закриваємо всі питання по кузову в одному цеху — від рихтування геометрії до підбору рідкісного ксиралік-кольору. Без розкидання по майстернях.
            </p>
          </header>

          <div className="svc-grid">

            {/* Card 01 — Painting */}
            <article className="svc-card">
              <div className="svc-meta">
                <span>01 / 04</span>
                <span>Painting</span>
              </div>
              <div className="svc-icon" aria-hidden={true}>
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter">
                  <path d="M24 6 C24 6 14 19 14 28 a10 10 0 0 0 20 0 C34 19 24 6 24 6 Z"/>
                  <path d="M19 30 a5 5 0 0 0 5 5"/>
                </svg>
              </div>
              <h3>Фарбування<br />в камері</h3>
              <ul className="svc-list">
                <li>Локальне фарбування (плямою / переходом)</li>
                <li>Повне фарбування авто</li>
                <li>Фарбування окремих елементів — бампер, капот, двері</li>
              </ul>
              <div className="svc-pin">
                <span className="label">Фішка</span>
                Підбір кольору в лабораторії — <strong>включно зі складними ксираліками</strong>.
              </div>
            </article>

            {/* Card 02 — Bodywork */}
            <article className="svc-card">
              <div className="svc-meta">
                <span>02 / 04</span>
                <span>Bodywork</span>
              </div>
              <div className="svc-icon" aria-hidden={true}>
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="square" strokeLinejoin="miter">
                  <rect x="7" y="8" width="22" height="10"/>
                  <path d="M7 10 L3 10 M7 16 L3 16"/>
                  <rect x="14" y="18" width="8" height="26"/>
                </svg>
              </div>
              <h3>Відновлення<br />геометрії</h3>
              <ul className="svc-list">
                <li>Рихтування на стапелі (витягування лонжеронів)</li>
                <li>Робота з алюмінієм — складний ремонт</li>
                <li>Пайка пластику та бамперів, відновлення кріплень</li>
                <li>Зварювальні роботи</li>
              </ul>
            </article>

            {/* Card 03 — Parts (TOP) */}
            <article className="svc-card svc-card--top">
              <div className="svc-meta">
                <span>03 / 04</span>
                <span className="svc-badge">ТОП</span>
              </div>
              <div className="svc-icon" aria-hidden={true}>
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="square" strokeLinejoin="miter">
                  <path d="M24 6 L42 14 L42 34 L24 42 L6 34 L6 14 Z"/>
                  <path d="M6 14 L24 22 L42 14"/>
                  <path d="M24 22 L24 42"/>
                  <path d="M15 10 L33 18" strokeDasharray="2 2"/>
                </svg>
              </div>
              <h3>Пошук<br />запчастин</h3>
              <ul className="svc-list">
                <li>Вам не треба шукати деталі по шротах</li>
                <li>Знайдемо, замовимо, перевіримо якість</li>
                <li>Доставимо в цех — все під один договір</li>
              </ul>
              <div className="svc-pin">
                <span className="label">Аргумент</span>
                <strong>«Ви приганяєте побите — забираєте ціле.»</strong>
              </div>
            </article>

            {/* Card 04 — Detailing */}
            <article className="svc-card">
              <div className="svc-meta">
                <span>04 / 04</span>
                <span>Finish</span>
              </div>
              <div className="svc-icon" aria-hidden={true}>
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter">
                  <path d="M24 6 L40 20 L24 42 L8 20 Z"/>
                  <path d="M8 20 L40 20 M16 20 L24 6 M32 20 L24 6 M16 20 L24 42 M32 20 L24 42"/>
                </svg>
              </div>
              <h3>Полірування<br />та захист</h3>
              <ul className="svc-list">
                <li>Глибоке полірування кузова — зняття «павутинки»</li>
                <li>Відновлення прозорості фар, лакування</li>
                <li>Передпродажна підготовка</li>
              </ul>
            </article>

          </div>

          {/* Secondary services strip */}
          <div className="svc-extra">
            <span className="tag">// Також</span>
            <div className="items">
              <span>Заміна мастил</span>
              <span>Фільтри</span>
              <span>Дрібний ремонт ходової</span>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="svc-cta">
            <div className="svc-cta-text">
              <span className="k">// Не впевнені, що саме вам потрібно?</span>
              <h4>Розкажіть про проблему — підкажемо, що робити.</h4>
            </div>
            <a href="tel:+380992334420" className="btn btn--primary">
              <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square"><path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>
              <span>Безкоштовна консультація</span>
              <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="square"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </a>
          </div>

        </div>
      </section>

      {/* 04 · АЛГОРИТМ СПІВПРАЦІ */}
      <section className="workflow" id="workflow" ref={wfSectionRef}>
        <div className="container">

          <header className="wf-head">
            <div>
              <div className="hero-eyebrow">
                <span className="bar"></span>
                <span className="num">04</span>
                <span>Правила гри</span>
              </div>
              <h2 className="wf-title">
                Як ми <span className="accent">працюємо</span>
              </h2>
            </div>
            <p className="wf-intro">
              Тут не «на прохідній». Беремо в роботу за записом — це дисципліна, яка дозволяє віддавати якість, а не халтуру.
            </p>
          </header>

          {/* Progress track + nodes */}
          <div className="wf-track" id="wf-track" aria-hidden={true}>
            <div className="fill" ref={wfFillRef}></div>
            <div className="nodes">
              {[0,1,2,3,4,5].map(i => (
                <span key={i} className="node" ref={el => { if(el) wfNodeRefs.current[i] = el; }}></span>
              ))}
            </div>
          </div>

          <ol className="wf-grid">

            <li className="step">
              <div className="step-head">
                <span className="step-num">01</span>
                <span className="step-tag">Step / 06</span>
              </div>
              <div className="step-title">Оцінка та бюджет</div>
              <div className="step-gist">// Не їдьте дарма</div>
              <p className="step-body">Надішліть фото пошкоджень у <em>Viber</em> або <em>Telegram</em>. Назвемо орієнтовну вилку цін. Якщо порядок цифр підходить — домовляємось про огляд.</p>
            </li>

            <li className="step">
              <div className="step-head">
                <span className="step-num">02</span>
                <span className="step-tag">Step / 06</span>
              </div>
              <div className="step-title">Запис у чергу</div>
              <div className="step-gist">// Ми затребувані</div>
              <p className="step-body">Узгоджуємо дату. Ви потрапляєте в графік. Ніяких «живих черг» і спонтанних візитів — це поважає і ваш, і наш час.</p>
            </li>

            <li className="step step--critical">
              <div className="step-head">
                <span className="step-num">03</span>
                <span className="step-tag">Critical · 24h</span>
              </div>
              <div className="step-title">Дзвінок «за 24 години»</div>
              <div className="step-gist">// Контроль в&apos;їзду</div>
              <p className="step-body"><em>Не приганяйте авто навмання.</em> Ми самі зателефонуємо за день до початку робіт, коли місце звільниться. Тільки після цього дзвінка — ви їдете до нас.</p>
            </li>

            <li className="step">
              <div className="step-head">
                <span className="step-num">04</span>
                <span className="step-tag">Step / 06</span>
              </div>
              <div className="step-title">Завдаток і старт</div>
              <div className="step-gist">// Фінансова гарантія</div>
              <p className="step-body">При передачі ключів — завдаток на матеріали та запчастини. Робота починається тільки після передоплати: ваша гарантія серйозності, наша — закупівля якісних компонентів.</p>
            </li>

            <li className="step">
              <div className="step-head">
                <span className="step-num">05</span>
                <span className="step-tag">Step / 06</span>
              </div>
              <div className="step-title">Технологічний процес</div>
              <div className="step-gist">// Не підганяйте нас</div>
              <p className="step-body">Дотримуємось часу висихання шпаклівки, ґрунту та лаку. Якщо технологія вимагає 12 годин сушки — ми чекаємо 12 годин. <em>Якість не терпить поспіху.</em></p>
            </li>

            <li className="step">
              <div className="step-head">
                <span className="step-num">06</span>
                <span className="step-tag">Step / 06</span>
              </div>
              <div className="step-title">Видача та зберігання</div>
              <div className="step-gist">// Забирайте вчасно</div>
              <p className="step-body">Повідомляємо про готовність. <em>3 дні</em> на безкоштовне зберігання. Далі — плата за стоянку: нам потрібне місце для наступного клієнта.</p>
            </li>

          </ol>

          {/* Warning panel */}
          <aside className="wf-warning" role="note">
            <div className="sign" aria-hidden={true}><span>!</span></div>
            <div className="text">
              <div className="lbl">Важливо</div>
              <p>Ми <strong>не беремо в роботу</strong> «термінові» замовлення з порушенням технології. Якщо потрібно «аби як, але до вечора» — ми не зможемо допомогти. Це принципова позиція, а не ввічливість.</p>
            </div>
          </aside>

        </div>
      </section>

      {/* 05 · ВАРТІСТЬ РОБІТ */}
      <section className="pricing" id="pricing">
        <div className="container">

          <header className="pr-head">
            <div>
              <div className="hero-eyebrow">
                <span className="bar"></span>
                <span className="num">05</span>
                <span>Чесний прайс</span>
              </div>
              <h2 className="pr-title">
                Базові ціни на <span className="accent">фарбування</span>
                <span className="sub">// Start price · $ USD</span>
              </h2>
            </div>
            <p className="pr-includes">
              Ціна включає: <strong>Розбірку/Збірку</strong> + <strong>Підготовку</strong> + <strong>Матеріали</strong> + <strong>Фарбу</strong> + <strong>Роботу майстра</strong>. Жодних прихованих рядків у чеку.
            </p>
          </header>

          {/* The price board */}
          <div className="pr-board">

            {/* Exterior */}
            <section className="pr-section">
              <header className="pr-section-head">
                <span className="code">// EX</span>
                <span className="name">Зовнішні елементи</span>
                <span className="bar"></span>
                <span className="meta">07 позицій</span>
              </header>

              <div className="price-row">
                <span className="code">EX.01</span>
                <span className="name">Капот <small>(зовні)</small></span>
                <span className="dots"></span>
                <span className="price"><span className="v">260</span><span className="sep">—</span><span className="v">500</span><span className="unit">USD</span></span>
              </div>
              <div className="price-row">
                <span className="code">EX.02</span>
                <span className="name">Бампер <small>(передній / задній)</small></span>
                <span className="dots"></span>
                <span className="price"><span className="v">180</span><span className="sep">—</span><span className="v">250</span><span className="unit">USD</span></span>
              </div>
              <div className="price-row">
                <span className="code">EX.03</span>
                <span className="name">Двері</span>
                <span className="dots"></span>
                <span className="price"><span className="v">160</span><span className="sep">—</span><span className="v">200</span><span className="unit">USD</span></span>
              </div>
              <div className="price-row">
                <span className="code">EX.04</span>
                <span className="name">Крило <small>переднє</small></span>
                <span className="dots"></span>
                <span className="price"><span className="v">160</span><span className="sep">—</span><span className="v">180</span><span className="unit">USD</span></span>
              </div>
              <div className="price-row">
                <span className="code">EX.05</span>
                <span className="name">Крило <small>заднє</small></span>
                <span className="dots"></span>
                <span className="price"><span className="v">170</span><span className="sep">—</span><span className="v">200</span><span className="unit">USD</span></span>
              </div>
              <div className="price-row">
                <span className="code">EX.06</span>
                <span className="name">Кришка багажника</span>
                <span className="dots"></span>
                <span className="price"><span className="v">160</span><span className="sep">—</span><span className="v">220</span><span className="unit">USD</span></span>
              </div>
              <div className="price-row">
                <span className="code">EX.07</span>
                <span className="name">Пороги <small>(накладки / метал)</small></span>
                <span className="dots"></span>
                <span className="price"><span className="v">150</span><span className="sep">—</span><span className="v">170</span><span className="unit">USD</span></span>
              </div>
            </section>

            {/* Details */}
            <section className="pr-section">
              <header className="pr-section-head">
                <span className="code">// DT</span>
                <span className="name">Додаткові елементи</span>
                <span className="bar"></span>
                <span className="meta">04 позиції</span>
              </header>

              <div className="price-row">
                <span className="code">DT.01</span>
                <span className="name">Капот <small>(внутрянка)</small></span>
                <span className="dots"></span>
                <span className="price"><span className="v">100</span><span className="sep">—</span><span className="v">150</span><span className="unit">USD</span></span>
              </div>
              <div className="price-row">
                <span className="code">DT.02</span>
                <span className="name">Внутрішні отвори <small>(проєми)</small></span>
                <span className="dots"></span>
                <span className="price"><span className="v">60</span><span className="sep">—</span><span className="v">120</span><span className="unit">USD / шт</span></span>
              </div>
              <div className="price-row">
                <span className="code">DT.03</span>
                <span className="name">Фари <small>(лак / полірування)</small></span>
                <span className="dots"></span>
                <span className="price"><span className="v">60</span><span className="sep">—</span><span className="v">80</span><span className="unit">USD / пара</span></span>
              </div>
              <div className="price-row">
                <span className="code">DT.04</span>
                <span className="name">Дзеркала / решітки</span>
                <span className="dots"></span>
                <span className="price is-individual">Індивідуально</span>
              </div>
            </section>

            {/* Service */}
            <section className="pr-section pr-section--service">
              <header className="pr-section-head">
                <span className="code">// SV</span>
                <span className="name">Слюсарні роботи</span>
                <span className="bar"></span>
                <span className="meta">Бонус-цех</span>
              </header>
              <p className="pr-service-intro">
                Маємо <strong>власний підйомник</strong>. Поки сохне фарба — можемо виконати ТО, щоб ви не їздили в інший сервіс.
              </p>
              <ul className="pr-service-list">
                <li>Заміна мастил</li>
                <li>Заміна фільтрів</li>
                <li>Дрібний ремонт ходової</li>
                <li>Діагностика підвіски</li>
              </ul>
            </section>

          </div>

          {/* Why price can change */}
          <aside className="pr-why" role="note">
            <header className="pr-why-head">
              <div className="icon" aria-hidden={true}><span>!</span></div>
              <h3>Чому ціна може змінитися?</h3>
            </header>
            <div className="pr-why-grid">
              <div className="pr-why-item">
                <span className="n">01</span>
                <h4>Матеріал деталі</h4>
                <p>Робота з <em>алюмінієм</em> складніша і дорожча за сталь — інші технології, інший інструмент.</p>
              </div>
              <div className="pr-why-item">
                <span className="n">02</span>
                <h4>Стан деталі</h4>
                <p>Нова деталь — це одне. Деталь, яку треба <em>рихтувати, паяти</em> або знімати 5 шарів старої шпаклівки — це інший час і гроші.</p>
              </div>
              <div className="pr-why-item">
                <span className="n">03</span>
                <h4>Складність кольору</h4>
                <p>Тришаровий перламутр чи <em>Xirallic</em> коштує дорожче за звичайний металік — компоненти й нанесення.</p>
              </div>
            </div>
          </aside>

          {/* Bottom CTA */}
          <div className="pr-cta">
            <div className="lhs">
              <span className="k">// Хочете точну цифру?</span>
              <h4>Надішліть фото пошкодження — порахуємо за пару годин.</h4>
            </div>
            <div className="rhs">
              <a href={CONTACTS.telegram} target="_blank" rel="noopener" className="btn btn--primary" aria-label="Оцінити в Telegram">
                <svg className="ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden={true}><path d="M21.94 4.34a1.2 1.2 0 0 0-1.27-.19L3.1 11.31c-.86.35-.83 1.6.05 1.91l4.42 1.53 1.68 5.45a.9.9 0 0 0 1.51.38l2.43-2.41 4.66 3.42a1.2 1.2 0 0 0 1.88-.7l3.16-15.55a1.2 1.2 0 0 0-.45-1zM9.7 14.79l9.13-7.59-6.94 8.7-2.19 4.61z"/></svg>
                <span>Telegram</span>
              </a>
              <a href={CONTACTS.viber} className="btn btn--ghost" aria-label="Оцінити в Viber">
                <svg className="ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden={true}><path d="M12 2C7 2 3 5 3 9.4c0 2.3 1.1 4.3 2.8 5.7l-.6 3.3c-.1.4.4.7.7.5l3-1.7c1 .3 2 .4 3.1.4 5 0 9-3 9-7.4S17 2 12 2zm-3.6 4.6c.4 0 .8.3 1 .8l.4 1c.1.4 0 .8-.3 1l-.4.3c.4 1 1.2 1.8 2.2 2.2l.3-.4c.3-.3.7-.4 1-.3l1 .4c.5.2.8.6.8 1l-.1.7c-.2.7-.9 1.2-1.7 1.2-2.6 0-5.4-2.8-5.4-5.4 0-.8.5-1.5 1.2-1.7l.7-.1z"/></svg>
                <span>Viber</span>
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* 06 · ТЕХНОЛОГІЯ ТА ЧАС */}
      <section className={`tech${techVisible ? " is-visible" : ""}`} id="tech" ref={techSectionRef}>
        <div className="container">

          <header className="tech-head">
            <div>
              <div className="hero-eyebrow">
                <span className="bar"></span>
                <span className="num">06</span>
                <span>Технологія та час</span>
              </div>
              <h2 className="tech-title">
                Чому <span className="accent">не «на вчора»</span>?
              </h2>
            </div>
            <p className="tech-intro">
              Фізика та хімія процесу. Якщо коротко — ми не пропускаємо технологічні етапи, бо за рік ви побачите наслідки на сонці.
            </p>
          </header>

          <div className="tech-body">

            {/* Cross-section infographic */}
            <aside className="cross" aria-label="Розріз шарів покриття">
              <div className="cross-frame">
                <div className="cross-head">
                  <span className="k">// X-section</span>
                  <span className="t">Шари покриття</span>
                  <span className="bar"></span>
                </div>

                <ol className="layers">
                  <li className="layer l-clear">
                    <span className="swatch" aria-hidden={true}></span>
                    <div className="info">
                      <div className="row1">
                        <span className="code">L 05</span>
                        <span className="name">Лак</span>
                      </div>
                      <span className="desc">Clearcoat · захист від УФ</span>
                    </div>
                    <span className="thick">50–80<small>мкм</small></span>
                  </li>
                  <li className="layer l-base">
                    <span className="swatch" aria-hidden={true}></span>
                    <div className="info">
                      <div className="row1">
                        <span className="code">L 04</span>
                        <span className="name">База / Колір</span>
                      </div>
                      <span className="desc">Base · пігмент + металік</span>
                    </div>
                    <span className="thick">15–25<small>мкм</small></span>
                  </li>
                  <li className="layer l-primer">
                    <span className="swatch" aria-hidden={true}></span>
                    <div className="info">
                      <div className="row1">
                        <span className="code">L 03</span>
                        <span className="name">Ґрунт</span>
                      </div>
                      <span className="desc">Primer · адгезія + антикор</span>
                    </div>
                    <span className="thick">40–60<small>мкм</small></span>
                  </li>
                  <li className="layer l-filler">
                    <span className="swatch" aria-hidden={true}></span>
                    <div className="info">
                      <div className="row1">
                        <span className="code">L 02</span>
                        <span className="name">Шпаклівка</span>
                      </div>
                      <span className="desc">Filler · геометрія поверхні</span>
                    </div>
                    <span className="thick">≤ 2<small>мм</small></span>
                  </li>
                  <li className="layer l-metal">
                    <span className="swatch" aria-hidden={true}></span>
                    <div className="info">
                      <div className="row1">
                        <span className="code">L 01</span>
                        <span className="name">Метал</span>
                      </div>
                      <span className="desc">Substrate · сталь / алюміній</span>
                    </div>
                    <span className="thick">—</span>
                  </li>
                </ol>

                <div className="cross-foot">
                  <span>Всього шарів: <span className="total">05</span></span>
                  <span>Сушка між шарами: <span className="total">12 год</span></span>
                </div>
              </div>
            </aside>

            {/* Text blocks */}
            <div className="tech-text">

              {/* A. Drying */}
              <article className="tech-block">
                <div className="kicker"><span className="letter">A</span> Процес висихання · Drying</div>
                <h3>Чому ми чекаємо?</h3>
                <p>Ми не віддаємо «сирі» авто. Шпаклівка та ґрунт мають пройти процес <em>усадки</em> (сісти), а розчинник — повністю випаруватися.</p>
                <p>Якщо пофарбувати <em>мокрим по мокрому</em> заради швидкості — через місяць на сонці матеріали просядуть, і з&apos;являться «риски» або провали.</p>
                <p className="conclusion">Ми <em>краще потримаємо</em> машину зайву добу в цеху, ніж ви повернетесь на переробку.</p>
              </article>

              {/* B. Color match */}
              <article className="tech-block">
                <div className="kicker"><span className="letter">B</span> Колористика · Color match</div>
                <h3>Чому код фарби з VIN не працює?</h3>
                <p>Ми <em>ніколи не фарбуємо</em> по коду з VIN-номеру або лючка бензобака. Фарба на авто вигоряє на сонці і змінює відтінок з роками — заводський код брехне на 2–3 тони.</p>
                <p>Ми знімаємо лючок бензобака, веземо його в <em>лабораторію</em>, і колорист підбирає рецепт під реальний стан вашого авто.</p>
              </article>

              {/* C. Complex colors (warn) */}
              <article className="tech-block warn">
                <div className="kicker"><span className="letter">C</span> Увага · Складні кольори</div>
                <h3>Pearl та Xirallic — ювелірна робота.</h3>
                <p>Якщо у вас складний колір — тришаровий <em>перламутр</em> або <em>ксиралік</em> — підбір може зайняти від <em>1 до 3 тижнів</em>. Це не затримка, це робота колориста.</p>
                <p className="conclusion">Краще почекати і отримати ідеальний колір, ніж їздити на <em>різнокольоровій</em> машині.</p>
              </article>

            </div>
          </div>

          {/* Owner quote */}
          <figure className="tech-quote">
            <blockquote>
              Я особисто перевіряю, як ліг лак і чи співпадає колір під різними кутами світла. Поки результат не буде <em>«nice»</em> — машина з боксу не виїде.
            </blockquote>
            <figcaption className="who">
              <span className="name">Власник цеху</span>
              <span className="role">// Майстер · Колорист</span>
              <span className="signed">Особиста відповідальність</span>
            </figcaption>
          </figure>

        </div>
      </section>

      {/* 07 · РЕПУТАЦІЯ */}
      <section className="rep" id="reputation">
        <div className="container">

          <header className="rep-head">
            <div>
              <div className="hero-eyebrow">
                <span className="bar"></span>
                <span className="num">07</span>
                <span>Дошка пошани</span>
              </div>
              <h2 className="rep-title">
                Нам довіряють <span className="accent">свої авто</span>
              </h2>
            </div>
            <p className="rep-intro">
              <strong>90% нових клієнтів</strong> приходять за рекомендацією друзів. Є клієнти, які обслуговуються у нас <strong>понад 10 років</strong>.
            </p>
          </header>

          {/* Reviews wall */}
          <div className="rep-feed">

            <article className="review">
              <div className="review-top">
                <span className="platform tg">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.94 4.34a1.2 1.2 0 0 0-1.27-.19L3.1 11.31c-.86.35-.83 1.6.05 1.91l4.42 1.53 1.68 5.45a.9.9 0 0 0 1.51.38l2.43-2.41 4.66 3.42a1.2 1.2 0 0 0 1.88-.7l3.16-15.55a1.2 1.2 0 0 0-.45-1z"/></svg>
                  Telegram
                </span>
                <span className="bar"></span>
                <span className="time">14:22</span>
              </div>
              <div className="review-who">
                <div className="avatar">ОР</div>
                <div className="who-info">
                  <span className="name">Олександр Р.</span>
                  <span className="car">BMW X5 · 2019</span>
                </div>
              </div>
              <div className="review-bubble">
                Дякую за бампер! Колір ліг ідеально, навіть на сонці не відрізнити. Як з заводу.
              </div>
              <div className="review-foot">
                <span className="review-rating">★ ★ ★ ★ ★</span>
                <span>Доставлено <span className="ticks">✓✓</span></span>
              </div>
            </article>

            <article className="review">
              <div className="review-top">
                <span className="platform viber">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7 2 3 5 3 9.4c0 2.3 1.1 4.3 2.8 5.7l-.6 3.3c-.1.4.4.7.7.5l3-1.7c1 .3 2 .4 3.1.4 5 0 9-3 9-7.4S17 2 12 2z"/></svg>
                  Viber
                </span>
                <span className="bar"></span>
                <span className="time">09:48</span>
              </div>
              <div className="review-who">
                <div className="avatar">ТК</div>
                <div className="who-info">
                  <span className="name">Тарас К.</span>
                  <span className="car">VW Passat B8</span>
                </div>
              </div>
              <div className="review-bubble">
                Хлопці, ви чарівники. Думав двері під заміну, а ви врятували. Економія — як на новий iPhone.
              </div>
              <div className="review-foot">
                <span className="review-rating">★ ★ ★ ★ ★</span>
                <span>Доставлено <span className="ticks">✓✓</span></span>
              </div>
            </article>

            <article className="review">
              <div className="review-top">
                <span className="platform tg">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.94 4.34a1.2 1.2 0 0 0-1.27-.19L3.1 11.31c-.86.35-.83 1.6.05 1.91l4.42 1.53 1.68 5.45a.9.9 0 0 0 1.51.38l2.43-2.41 4.66 3.42a1.2 1.2 0 0 0 1.88-.7l3.16-15.55a1.2 1.2 0 0 0-.45-1z"/></svg>
                  Telegram
                </span>
                <span className="bar"></span>
                <span className="time">18:03</span>
              </div>
              <div className="review-who">
                <div className="avatar">АМ</div>
                <div className="who-info">
                  <span className="name">Андрій М.</span>
                  <span className="car">Toyota Camry · 2021</span>
                </div>
              </div>
              <div className="review-bubble">
                Забрав машину — все супер. Окреме дякую, що помили салон! Не очікував такої уваги до дрібниць.
              </div>
              <div className="review-foot">
                <span className="review-rating">★ ★ ★ ★ ★</span>
                <span>Доставлено <span className="ticks">✓✓</span></span>
              </div>
            </article>

            <article className="review">
              <div className="review-top">
                <span className="platform tg">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.94 4.34a1.2 1.2 0 0 0-1.27-.19L3.1 11.31c-.86.35-.83 1.6.05 1.91l4.42 1.53 1.68 5.45a.9.9 0 0 0 1.51.38l2.43-2.41 4.66 3.42a1.2 1.2 0 0 0 1.88-.7l3.16-15.55a1.2 1.2 0 0 0-.45-1z"/></svg>
                  Telegram
                </span>
                <span className="bar"></span>
                <span className="time">11:30</span>
              </div>
              <div className="review-who">
                <div className="avatar">ІБ</div>
                <div className="who-info">
                  <span className="name">Ігор Б.</span>
                  <span className="car">Mazda 6 · 2018</span>
                </div>
              </div>
              <div className="review-bubble">
                Чекав 2 тижні на підбір кольору — це варто було. Перламутр як із заводу. Окремий респект за чесність по часу.
              </div>
              <div className="review-foot">
                <span className="review-rating">★ ★ ★ ★ ★</span>
                <span>Доставлено <span className="ticks">✓✓</span></span>
              </div>
            </article>

            <article className="review">
              <div className="review-top">
                <span className="platform viber">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7 2 3 5 3 9.4c0 2.3 1.1 4.3 2.8 5.7l-.6 3.3c-.1.4.4.7.7.5l3-1.7c1 .3 2 .4 3.1.4 5 0 9-3 9-7.4S17 2 12 2z"/></svg>
                  Viber
                </span>
                <span className="bar"></span>
                <span className="time">15:55</span>
              </div>
              <div className="review-who">
                <div className="avatar">ДС</div>
                <div className="who-info">
                  <span className="name">Дмитро С.</span>
                  <span className="car">Audi Q5 · US-import</span>
                </div>
              </div>
              <div className="review-bubble">
                Привіз авто з США з вм&apos;ятиною на крилі. Зробили — не знайти стику. Вилку цін дали чесну з самого початку.
              </div>
              <div className="review-foot">
                <span className="review-rating">★ ★ ★ ★ ★</span>
                <span>Доставлено <span className="ticks">✓✓</span></span>
              </div>
            </article>

            <article className="review">
              <div className="review-top">
                <span className="platform tg">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.94 4.34a1.2 1.2 0 0 0-1.27-.19L3.1 11.31c-.86.35-.83 1.6.05 1.91l4.42 1.53 1.68 5.45a.9.9 0 0 0 1.51.38l2.43-2.41 4.66 3.42a1.2 1.2 0 0 0 1.88-.7l3.16-15.55a1.2 1.2 0 0 0-.45-1z"/></svg>
                  Telegram
                </span>
                <span className="bar"></span>
                <span className="time">20:10</span>
              </div>
              <div className="review-who">
                <div className="avatar">МП</div>
                <div className="who-info">
                  <span className="name">Микола П.</span>
                  <span className="car">Honda CR-V · 10+ років</span>
                </div>
              </div>
              <div className="review-bubble">
                10 років тут обслуговуюсь. Не лізу до інших — тут роблять як для себе. Спокій того вартий.
              </div>
              <div className="review-foot">
                <span className="review-rating">★ ★ ★ ★ ★</span>
                <span>Доставлено <span className="ticks">✓✓</span></span>
              </div>
            </article>

          </div>

          {/* Stats */}
          <div className="rep-stats" role="group" aria-label="Цифри">
            <div className="rep-stat">
              <div className="n">25<span className="plus">+</span></div>
              <div className="l">Років<br />досвіду</div>
            </div>
            <div className="rep-stat">
              <div className="n">1000<span className="plus">+</span></div>
              <div className="l">Відновлених<br />деталей</div>
            </div>
            <div className="rep-stat">
              <div className="n">5<span className="dot">.0</span></div>
              <div className="l">Рейтинг<br />якості</div>
            </div>
          </div>

          {/* Bottom CTA: Google + QR */}
          <div className="rep-cta-row">

            <div className="rep-google">
              <div className="stars" aria-label="5 з 5">★ ★ ★ ★ ★</div>
              <div className="text">
                <span className="k">// Прозоро · Незалежно</span>
                <h4>Почитайте відгуки наших клієнтів на <em>Google Maps</em>.</h4>
              </div>
              <a href={CONTACTS.googleMaps} target="_blank" rel="noopener" className="btn btn--primary">
                <span>Читати відгуки</span>
                <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="square"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </a>
            </div>

            <div className="rep-qr">
              <div className="qr-frame">
                <QrCode value={CONTACTS.googleMaps} size={128} />
              </div>
              <div className="qr-info">
                <span className="k">// Вже були у нас?</span>
                <h4>Наведіть камеру, щоб залишити відгук</h4>
                <span className="hint">Перейдете на Google Maps</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 08 · АВТО З США */}
      <section className="us-cars" id="us-cars">
        <div className="us-bg" aria-hidden={true}>
          <img src="/assets/us-bg.jpg" alt="Морський контейнер з авто з США в порту" />
        </div>
        <div className="us-grain" aria-hidden={true}></div>

        <span className="us-stamp" aria-hidden={true}>
          USA<br />Import
          <small>Authorized · Owner-checked</small>
        </span>

        <div className="us-codes br" aria-hidden={true}>
          <span>// MSCU 9876543 · 42G1</span>
          <span className="live">Port · IF-UA · ETA 14d</span>
        </div>

        <div className="us-inner">
          <div className="container">
            <div className="us-content">

              <div className="hero-eyebrow">
                <span className="bar"></span>
                <span className="num">08</span>
                <span>Авто з США</span>
              </div>

              <h2 className="us-title">
                <span className="thin">Мрія</span>
                Авто з США <span className="accent">під ключ.</span>
              </h2>

              <p className="us-sub">
                Привеземо, відремонтуємо і віддамо вам ключі. <strong>Повний цикл</strong> без посередників — від ставки на аукціоні до видачі в цеху.
              </p>

              <div className="us-killer">
                <div className="tag">// Killer feature</div>
                <p>Боїтеся купити «кота в мішку»? <strong>Власник особисто оцінює пошкодження лоту на аукціоні до покупки.</strong> Прораховуємо вартість ремонту заздалегідь — бо ми майстри, а не менеджери з продажу.</p>
              </div>

              <ul className="us-bullets">
                <li>
                  <span className="check" aria-hidden={true}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square"><path d="M5 12l5 5 9-11"/></svg>
                  </span>
                  Економія <strong>до 30–40%</strong> від ринку України
                </li>
                <li>
                  <span className="check" aria-hidden={true}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square"><path d="M5 12l5 5 9-11"/></svg>
                  </span>
                  Прозора історія — <strong>Carfax / Autocheck</strong> на кожне авто
                </li>
                <li>
                  <span className="check" aria-hidden={true}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square"><path d="M5 12l5 5 9-11"/></svg>
                  </span>
                  Ремонт на нашому сервісі з <strong>гарантією</strong>
                </li>
              </ul>

              <a href={CONTACTS.telegram} target="_blank" rel="noopener" className="btn btn--primary">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="square" strokeLinejoin="miter" aria-hidden={true}>
                  <path d="M3 16 L21 16 L19 20 L5 20 Z"/>
                  <path d="M5 16 L5 9 L19 9 L19 16"/>
                  <path d="M9 9 L9 5 L15 5 L15 9"/>
                  <path d="M3 16 L1 13"/>
                </svg>
                <span>Дізнатися про пригон авто</span>
                <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="square"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </a>

            </div>
          </div>
        </div>
      </section>

      {/* 09 · FAQ */}
      <section className="faq" id="faq">
        <div className="container">

          <header className="faq-head">
            <div>
              <div className="hero-eyebrow">
                <span className="bar"></span>
                <span className="num">09</span>
                <span>Часті запитання</span>
              </div>
              <h2 className="faq-title">
                Без зайвих <span className="accent">запитань.</span>
              </h2>
            </div>
            <p className="faq-intro">
              Найчастіше клієнти питають одне й те саме. Ось чесні відповіді — без маркетингового туману.
            </p>
          </header>

          <div className="faq-grid">

            <details className="faq-item">
              <summary>
                <span className="num">Q.01</span>
                <span className="q">Чому ви не кажете точну ціну по телефону?</span>
                <span className="toggle" aria-hidden={true}></span>
              </summary>
              <div className="a">
                <p>Ми бачимо тільки зовнішнє пошкодження. Приховані дефекти (зламані кріплення фар, тріщини підсилювачів, зміщення геометрії) видно лише після розбору.</p>
                <p>Тому ми називаємо <strong>чесну вилку цін</strong> (від і до), а точна сума формується по факту виконаних робіт — <em>щоб ви не переплачували «на всяк випадок»</em>.</p>
              </div>
            </details>

            <details className="faq-item">
              <summary>
                <span className="num">Q.02</span>
                <span className="q">Коли можна пригнати машину?</span>
                <span className="toggle" aria-hidden={true}></span>
              </summary>
              <div className="a">
                <p><strong>Тільки за попереднім записом.</strong> Черга дозволяє приділити вашому авто максимум уваги.</p>
                <p>Ми самі зателефонуємо вам <em>за 1 день до початку робіт</em>, щоб підтвердити візит. Не їдьте без дзвінка — місця може не бути.</p>
              </div>
            </details>

            <details className="faq-item">
              <summary>
                <span className="num">Q.03</span>
                <span className="q">Скільки часу займе ремонт?</span>
                <span className="toggle" aria-hidden={true}></span>
              </summary>
              <div className="a">
                <p>Ми не порушуємо технологічні процеси заради швидкості. Шпаклівка і ґрунт мають висохнути, а лак — стверднути.</p>
                <p>Середній ремонт займає <strong>від 3 до 7 днів</strong> залежно від складності. <em>Ми не віддаємо «сирі» авто.</em></p>
              </div>
            </details>

            <details className="faq-item">
              <summary>
                <span className="num">Q.04</span>
                <span className="q">Чому так довго підбираєте фарбу?</span>
                <span className="toggle" aria-hidden={true}></span>
              </summary>
              <div className="a">
                <p>Ми <strong>не фарбуємо по коду</strong>, бо він не враховує вигорання. Колір підбираємо в лабораторії — під реальний стан вашого авто.</p>
                <p>Якщо у вас складний колір (тришаровий перламутр або ксиралік), краще <em>почекати 2–3 тижні</em> на ідеальний рецепт, ніж пофарбувати машину в різнотон.</p>
              </div>
            </details>

            <details className="faq-item">
              <summary>
                <span className="num">Q.05</span>
                <span className="q">Коли забирати авто? Правило 3 днів.</span>
                <span className="toggle" aria-hidden={true}></span>
              </summary>
              <div className="a">
                <p>Ми цінуємо ваш час — і просимо цінувати наш простір. Після повідомлення про готовність (статус <strong>«Готово»</strong>) — безкоштовне зберігання авто становить <em>3 доби</em>.</p>
                <p>Далі нараховується плата за стоянку, бо нам потрібне місце для наступного клієнта.</p>
              </div>
            </details>

            <details className="faq-item">
              <summary>
                <span className="num">Q.06</span>
                <span className="q">Яка гарантія?</span>
                <span className="toggle" aria-hidden={true}></span>
              </summary>
              <div className="a">
                <p>На фарбування <strong>нових деталей</strong> — гарантія <em>1 рік</em> на відшарування лаку.</p>
                <p>Якщо ми відновлюємо гнилу або сильно биту деталь (реставрація), робимо це максимально якісно, але гарантію на те, що метал не «зіграє» з часом, дати неможливо. <strong>Ми гарантуємо дотримання технології.</strong></p>
              </div>
            </details>

          </div>

          <div className="faq-foot">
            <span className="k">// Не знайшли відповідь?</span>
            <p>Напишіть у <strong>Telegram</strong> або <strong>Viber</strong> — відповімо за пару годин у робочий час.</p>
          </div>

        </div>
      </section>

      {/* 10 · ФУТЕР */}
      <footer className="site-footer" id="contacts">
        <div className="container">

          {/* persistent warning strip */}
          <aside className="footer-strip" role="note">
            <div className="icon" aria-hidden={true}><span>!</span></div>
            <span className="lbl">Увага</span>
            <p>Безкоштовне зберігання готового авто — <strong>3 доби</strong>. Далі нараховується плата за стоянку.</p>
          </aside>

          <div className="footer-grid">

            {/* COL 1 — Brand & Nav */}
            <div className="footer-col footer-brand">
              <div className="logo-lg">
                <span>nice</span><span className="dot">.</span><span>car</span><span className="dot">.</span><span className="accent">if</span>
              </div>
              <div className="slogan">Робимо як <em>для себе.</em></div>

              <h5>Навігація</h5>
              <ul className="footer-nav">
                <li><a href="#hero">Головна</a></li>
                <li><a href="#us-cars">Авто з США</a></li>
                <li><a href="/gallery">Галерея робіт</a></li>
                <li><a href="#workflow">Правила сервісу</a></li>
                <li><a href="#pricing">Прайс</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>

            {/* COL 2 — Contacts */}
            <div className="footer-col footer-contacts">
              <h5>Зв&apos;язок</h5>
              <div className="footer-phone">
                <span className="k">// Подзвонити майстру</span>
                <a href="tel:+380992334420">+380 99 233 44 20</a>
              </div>

              <div className="footer-msgs">
                <a href={CONTACTS.telegram} target="_blank" rel="noopener" className="msg-btn">
                  <svg className="ico tg" viewBox="0 0 24 24" fill="currentColor"><path d="M21.94 4.34a1.2 1.2 0 0 0-1.27-.19L3.1 11.31c-.86.35-.83 1.6.05 1.91l4.42 1.53 1.68 5.45a.9.9 0 0 0 1.51.38l2.43-2.41 4.66 3.42a1.2 1.2 0 0 0 1.88-.7l3.16-15.55a1.2 1.2 0 0 0-.45-1z"/></svg>
                  <div>
                    <span>Telegram</span>
                    <small>Оцінка по фото</small>
                  </div>
                  <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </a>
                <a href={CONTACTS.viber} className="msg-btn">
                  <svg className="ico viber" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7 2 3 5 3 9.4c0 2.3 1.1 4.3 2.8 5.7l-.6 3.3c-.1.4.4.7.7.5l3-1.7c1 .3 2 .4 3.1.4 5 0 9-3 9-7.4S17 2 12 2z"/></svg>
                  <div>
                    <span>Viber</span>
                    <small>Оцінка по фото</small>
                  </div>
                  <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </a>
                <a href={CONTACTS.instagram} target="_blank" rel="noopener" className="msg-btn">
                  <svg className="ico ig" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="square">
                    <rect x="3" y="3" width="18" height="18" rx="4"/>
                    <circle cx="12" cy="12" r="4"/>
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
                  </svg>
                  <div>
                    <span>Instagram</span>
                    <small>Свіжі роботи в Stories</small>
                  </div>
                  <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </a>
              </div>

              <h5>Графік роботи</h5>
              <dl className="footer-hours">
                <dt>Пн — Пт</dt><dd>09:00 — 18:00</dd>
                <dt>Сб</dt><dd>09:00 — 14:00</dd>
                <dt>Нд</dt><dd className="closed">Вихідний</dd>
              </dl>
            </div>

            {/* COL 3 — Location */}
            <div className="footer-col footer-loc">
              <h5>Локація</h5>
              <address>
                м. Івано-Франківськ,<br />
                <strong>вул. [Назва вулиці], 00</strong>
              </address>
              <p className="hint">
                <em>Орієнтир:</em> заїзд з боку Епіцентру, сині ворота.
              </p>

              {/* Map placeholder */}
              <div className="map" aria-label="Карта проїзду">
                <div className="map-grid" aria-hidden={true}></div>
                <div className="map-roads" aria-hidden={true}>
                  <svg viewBox="0 0 400 225" preserveAspectRatio="none">
                    <path d="M0 80 L400 95" stroke="#3a3a3a" strokeWidth="3" fill="none"/>
                    <path d="M0 160 L400 150" stroke="#3a3a3a" strokeWidth="2" fill="none"/>
                    <path d="M120 0 L130 225" stroke="#3a3a3a" strokeWidth="2" fill="none"/>
                    <path d="M280 0 L290 225" stroke="#3a3a3a" strokeWidth="3" fill="none"/>
                    <path d="M0 80 L60 50 L120 80" stroke="#2a2a2a" strokeWidth="1" fill="none"/>
                  </svg>
                </div>
                <span className="map-tag">// IF · UA <strong>NICE.car.if</strong></span>
                <span className="map-pin" aria-hidden={true}>
                  <span className="halo"></span>
                  <span className="dot"></span>
                </span>
                <span className="map-coords">
                  <span>48.9226° N</span>
                  <span>24.7111° E</span>
                  <span className="live">● live</span>
                </span>
              </div>

              <a href={CONTACTS.googleMaps} target="_blank" rel="noopener" className="route-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square"><path d="M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>
                Побудувати маршрут
              </a>
            </div>

            {/* COL 4 — Important rules */}
            <div className="footer-col footer-imp">
              <h5>Правила сервісу</h5>
              <ul className="footer-rules">
                <li>Робота тільки за <strong>попереднім записом</strong>. Без дзвінка-підтвердження — не приїжджайте.</li>
                <li>Адміністрація <strong>не несе відповідальності</strong> за цінні речі, залишені в салоні.</li>
                <li><em>Увага:</em> безкоштовне зберігання готового авто — <strong>3 доби</strong>. Далі нараховується плата за стоянку.</li>
                <li>Гарантія на фарбування нових деталей — <strong>1 рік</strong>. На реставрацію — гарантуємо дотримання технології.</li>
              </ul>
            </div>

          </div>

          {/* Bottom bar */}
          <div className="footer-bottom">
            <span>© 2026 NICE.car.if · Всі права захищено.</span>
            <div className="links">
              <a href="#">Політика приватності</a>
              <a href="#">Умови сервісу</a>
              <a href="mailto:nicecarif@gmail.com">nicecarif@gmail.com</a>
            </div>
          </div>

          {/* SEO keywords */}
          <p className="seo-keywords" aria-hidden={true}>
            Кузовний ремонт Івано-Франківськ · рихтування авто · фарбування в камері · пайка бамперів · полірування фар · видалення вм&apos;ятин · авто з США під ключ Франківськ · підбір кольору ксиралік · реставрація геометрії · СТО Івано-Франківськ · фарбування авто за заводським стандартом · колорист IF.
          </p>

        </div>
      </footer>

      {/* FLOATING CALL BUTTON */}
      <a href="tel:+380992334420" className="floating-call" aria-label="Подзвонити">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square"><path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>
      </a>
    </>
  );
}
