"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CONTACTS } from "@/lib/constants";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { FloatingCallButton } from "@/components/site/FloatingCallButton";

/* ── types ─────────────────────────────────────────── */
type Cat     = "all" | "paint" | "body" | "polish" | "us";
type SzClass = "sz-1" | "sz-2" | "sz-3" | "sz-4" | "sz-5" | "sz-6" | "sz-7";

interface GalleryItem {
  id: string; num: string; sz: SzClass; cat: Exclude<Cat,"all">;
  tag: string; title: string; sub: string; hero?: boolean; ph: string;
}

interface ListRow {
  id: string; cat: Exclude<Cat,"all">; title: string; catLabel: string; meta: string; num: string; ph: string;
}

/* ── data ───────────────────────────────────────────── */
const GRID_ITEMS: GalleryItem[] = [
  { id:"g-01", num:"#01", sz:"sz-6", cat:"paint",  tag:"Painting",   hero:true, title:"Audi RS6 Avant · Frozen Grey",    sub:"Featured · Повне фарбування · 28 днів",  ph:"Audi RS6 · повне фарбування" },
  { id:"g-02", num:"#02", sz:"sz-4", cat:"body",   tag:"Bodywork",             title:"Tesla Model S · стапель",          sub:"Рихтування · 14 днів",                   ph:"Tesla Model S · стапель" },
  { id:"g-03", num:"#03", sz:"sz-1", cat:"polish", tag:"Detail",               title:"Глибоке полірування",              sub:"Mercedes E-Class",                       ph:"Mercedes · полірування макро" },
  { id:"g-04", num:"#04", sz:"sz-1", cat:"polish", tag:"Detail",               title:"Фари · лакування",                 sub:"Honda CR-V",                             ph:"Honda · відновлення фар" },
  { id:"g-05", num:"#05", sz:"sz-2", cat:"paint",  tag:"Painting",             title:"Mazda CX-5 · Soul Red Crystal",   sub:"Тришаровий перламутр · 18 днів",         ph:"Mazda CX-5 · Soul Red" },
  { id:"g-06", num:"#06", sz:"sz-1", cat:"us",     tag:"US Import",            title:"Ford F-150 · з порту",            sub:"Lariat 2020 · TX salvage",               ph:"Ford F-150 · з США" },
  { id:"g-07", num:"#07", sz:"sz-5", cat:"body",   tag:"Bodywork",             title:"VW Tiguan · пайка кріплень",      sub:"Бампер · відновлення",                   ph:"VW Tiguan · пайка" },
  { id:"g-08", num:"#08", sz:"sz-4", cat:"paint",  tag:"Painting",             title:"Porsche 911 Carrera",             sub:"GT Silver · повне",                      ph:"Porsche 911 · камера" },
  { id:"g-09", num:"#09", sz:"sz-1", cat:"paint",  tag:"Painting",             title:"Toyota Camry · бампер",           sub:"Локальне фарбування",                    ph:"Toyota Camry · бампер" },
  { id:"g-10", num:"#10", sz:"sz-1", cat:"polish", tag:"Detail",               title:"Макро · крапля води",             sub:"After-detailing shot",                   ph:"Макро · деталь" },
  { id:"g-11", num:"#11", sz:"sz-3", cat:"us",     tag:"US Import",            title:"Tesla Model Y · IAAI NY",         sub:"Lot → ключі · 47 днів",                  ph:"Tesla Model Y · IAAI" },
  { id:"g-12", num:"#12", sz:"sz-4", cat:"body",   tag:"Bodywork",             title:"Зварювання лонжерону",            sub:"Subaru Outback · алюміній",              ph:"Зварювання · іскри" },
  { id:"g-13", num:"#13", sz:"sz-2", cat:"paint",  tag:"Painting",             title:"Підбір кольору · лабораторія",   sub:"Xirallic · Mercedes",                    ph:"Лабораторія · підбір" },
  { id:"g-14", num:"#14", sz:"sz-1", cat:"us",     tag:"US Import",            title:"Контейнер · Гданськ",             sub:"Розвантаження",                          ph:"Контейнер · порт" },
  { id:"g-15", num:"#15", sz:"sz-1", cat:"paint",  tag:"Painting",             title:"Spray booth",                     sub:"Робочий процес",                         ph:"Кабіна · майстер" },
  { id:"g-16", num:"#16", sz:"sz-5", cat:"polish", tag:"Detail",               title:"Range Rover · pre-sale",          sub:"Полірування + детейлінг",                ph:"Range Rover · детейлінг" },
  { id:"g-17", num:"#17", sz:"sz-2", cat:"body",   tag:"Bodywork",             title:"Lexus RX 350",                    sub:"Рихтування + локальне",                  ph:"Lexus RX · рихтування" },
  { id:"g-18", num:"#18", sz:"sz-4", cat:"paint",  tag:"Painting",             title:"Skoda Octavia · двері",           sub:"Race Blue Metallic",                     ph:"Skoda · Race Blue" },
];

const LIST_ROWS: ListRow[] = [
  { id:"gl-01", cat:"paint",  title:"Audi RS6 Avant · Frozen Grey",        catLabel:"Painting",   meta:"28 днів · повне",        num:"#01", ph:"RS6 thumb" },
  { id:"gl-02", cat:"body",   title:"Tesla Model S · стапель",             catLabel:"Bodywork",   meta:"14 днів",                num:"#02", ph:"Tesla S thumb" },
  { id:"gl-03", cat:"polish", title:"Mercedes E-Class · полірування",      catLabel:"Polish",     meta:"3 дні",                  num:"#03", ph:"Merc thumb" },
  { id:"gl-05", cat:"paint",  title:"Mazda CX-5 · Soul Red Crystal",       catLabel:"Painting",   meta:"18 днів · перламутр",    num:"#05", ph:"Mazda thumb" },
  { id:"gl-06", cat:"us",     title:"Ford F-150 Lariat · з США",           catLabel:"US Import",  meta:"9 днів · PDR",           num:"#06", ph:"F-150 thumb" },
  { id:"gl-07", cat:"body",   title:"VW Tiguan · пайка кріплень",          catLabel:"Bodywork",   meta:"5 днів",                 num:"#07", ph:"Tiguan thumb" },
  { id:"gl-08", cat:"paint",  title:"Porsche 911 · GT Silver",             catLabel:"Painting",   meta:"24 дні · повне",         num:"#08", ph:"Porsche thumb" },
  { id:"gl-11", cat:"us",     title:"Tesla Model Y · IAAI NY",             catLabel:"US Import",  meta:"47 днів · all-in",       num:"#11", ph:"Tesla Y thumb" },
  { id:"gl-13", cat:"paint",  title:"Підбір кольору · Mercedes Xirallic",  catLabel:"Painting",   meta:"21 день",                num:"#13", ph:"Merc lab thumb" },
  { id:"gl-16", cat:"polish", title:"Range Rover · pre-sale",              catLabel:"Polish",     meta:"4 дні",                  num:"#16", ph:"RR thumb" },
];

/* computed filter counts from real data */
const FILTERS: { key: Cat; label: string; count: number }[] = [
  { key:"all",    label:"Усі роботи",  count: GRID_ITEMS.length },
  { key:"paint",  label:"Фарбування",  count: GRID_ITEMS.filter(i => i.cat === "paint").length },
  { key:"body",   label:"Рихтування",  count: GRID_ITEMS.filter(i => i.cat === "body").length },
  { key:"polish", label:"Полірування", count: GRID_ITEMS.filter(i => i.cat === "polish").length },
  { key:"us",     label:"Авто з США",  count: GRID_ITEMS.filter(i => i.cat === "us").length },
];

const TL_ITEMS = [
  {
    date: "Жовтень · 2025",
    title: "Audi RS6 — повне фарбування у Frozen Grey",
    car: "// Avant 2020 · 89k km · 4.0 V8 TFSI",
    body: (
      <>Власник пригнав з України з вицвілим оригінальним кольором. <em>Підбір рецепту зайняв 9 днів</em>, повне фарбування — 19. Колір ідеально співпадає з ребрами і пластиком.</>
    ),
    tags: ["Повне", "Xirallic-pearl", "28 днів"],
    frames: [
      { cls:"frame span-2", lbl:"Booth · 19 day", ph:"RS6 у кабіні" },
      { cls:"frame",        lbl:"Before",          ph:"RS6 · до" },
      { cls:"frame",        lbl:"After",            ph:"RS6 · після" },
    ],
  },
  {
    date: "Серпень · 2025",
    title: "Tesla Model Y — повний цикл під ключ з США",
    car: "// Long Range AWD 2022 · IAAI NY",
    body: (
      <>Бічне пошкодження після вибраного нами лоту. <strong>Запчастини OEM з UA-складу</strong>, фарбування Midnight Silver Metallic, перевірка батареї. 47 днів від ставки до видачі — рекорд серед US-проєктів року.</>
    ),
    tags: ["US Import", "Side damage", "47 днів all-in"],
    frames: [
      { cls:"frame",        lbl:"Lot · NY",    ph:"Tesla · аукціон" },
      { cls:"frame",        lbl:"In repair",   ph:"Tesla · ремонт" },
      { cls:"frame span-2", lbl:"Delivered",   ph:"Tesla · видача" },
    ],
  },
  {
    date: "Червень · 2025",
    title: "BMW 3 Series — рятували передок після ДТП",
    car: "// 330i xDrive M Sport · 2019 · 64k km",
    body: (
      <>Витягування лонжеронів на стапелі, заміна капота і обох крил. <em>Заводський сапфірово-чорний</em> з ефектом перламутру — підбір в лабораторії 6 днів. Жодного «риски» на сонці.</>
    ),
    tags: ["Стапель", "Капот + крила", "19 днів"],
    frames: [
      { cls:"frame span-2", lbl:"Repair · 12 day", ph:"BMW 3 · стапель" },
      { cls:"frame",        lbl:"Crash",            ph:"BMW 3 · ДТП" },
      { cls:"frame",        lbl:"After",            ph:"BMW 3 · після" },
    ],
  },
];

/* ── component ───────────────────────────────────────── */
export default function GalleryClient() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [activeFilter, setActiveFilter] = useState<Cat>(() => {
    const p = searchParams.get("filter");
    return (FILTERS.some(f => f.key === p) ? (p as Cat) : "all");
  });
  const [activeView,  setActiveView]  = useState<"grid" | "list">("grid");
  const [isListView,  setIsListView]  = useState(false);
  const [scanPercent, setScanPercent] = useState(50);

  /* scanner refs */
  const scannerRef    = useRef<HTMLDivElement>(null);
  const afterLayerRef = useRef<HTMLDivElement>(null);
  const scanLineRef   = useRef<HTMLDivElement>(null);
  const handleRef     = useRef<HTMLButtonElement>(null);
  const draggingRef   = useRef(false);

  /* sync URL ↔ filter */
  function changeFilter(f: Cat) {
    setActiveFilter(f);
    const params = new URLSearchParams(searchParams.toString());
    if (f === "all") {
      params.delete("filter");
    } else {
      params.set("filter", f);
    }
    router.replace(`/gallery${params.toString() ? "?" + params.toString() : ""}`, { scroll: false });
  }

  /* scanner drag */
  const setPosition = useCallback((p: number) => {
    p = Math.max(0, Math.min(100, p));
    if (afterLayerRef.current) afterLayerRef.current.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
    if (scanLineRef.current)   scanLineRef.current.style.left   = p + "%";
    if (handleRef.current)     handleRef.current.style.left     = p + "%";
    setScanPercent(Math.round(p));
  }, []);

  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    function getClientX(e: MouseEvent | TouchEvent) {
      return "clientX" in e ? e.clientX : (e.touches[0]?.clientX ?? 0);
    }
    function updateFromEvent(e: MouseEvent | TouchEvent) {
      const rect = scanner!.getBoundingClientRect();
      setPosition(((getClientX(e) - rect.left) / rect.width) * 100);
    }
    function onMouseDown(e: MouseEvent) {
      draggingRef.current = true;
      scanner!.style.cursor = "ew-resize";
      updateFromEvent(e);
      e.preventDefault();
    }
    function onMouseMove(e: MouseEvent) { if (draggingRef.current) updateFromEvent(e); }
    function onMouseUp()                { draggingRef.current = false; scanner!.style.cursor = ""; }

    function onTouchStart(e: TouchEvent) {
      draggingRef.current = true;
      updateFromEvent(e);
      e.preventDefault();
    }
    function onTouchMove(e: TouchEvent) { if (draggingRef.current) updateFromEvent(e); }
    function onTouchEnd()               { draggingRef.current = false; }

    const handle = handleRef.current;
    handle?.addEventListener("mousedown",  onMouseDown);
    handle?.addEventListener("touchstart", onTouchStart, { passive: false });
    scanner.addEventListener("mousedown",  (e) => { if (!(e.target as Element).closest(".handle")) updateFromEvent(e); else onMouseDown(e); });
    scanner.addEventListener("touchstart", (e) => { if (!(e.target as Element).closest(".handle")) updateFromEvent(e); draggingRef.current = true; }, { passive: false });
    window.addEventListener("mousemove",   onMouseMove);
    window.addEventListener("mouseup",     onMouseUp);
    window.addEventListener("touchmove",   onTouchMove, { passive: false });
    window.addEventListener("touchend",    onTouchEnd);

    const t1 = setTimeout(() => setPosition(70), 400);
    const t2 = setTimeout(() => setPosition(30), 900);
    const t3 = setTimeout(() => setPosition(50), 1400);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      handle?.removeEventListener("mousedown",  onMouseDown);
      handle?.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("mousemove",   onMouseMove);
      window.removeEventListener("mouseup",     onMouseUp);
      window.removeEventListener("touchmove",   onTouchMove);
      window.removeEventListener("touchend",    onTouchEnd);
    };
  }, [setPosition]);

  function switchView(v: "grid" | "list") {
    setActiveView(v);
    setIsListView(v === "list");
  }

  const isHidden = (cat: Exclude<Cat,"all">) => activeFilter !== "all" && activeFilter !== cat;

  return (
    <>
      <SiteHeader activePage="gallery" />

      {/* ══ PAGE HEAD ════════════════════════════════════ */}
      <section className="page-head">
        <div className="container">
          <nav className="breadcrumb" aria-label="Шлях">
            <a href="/">Головна</a>
            <span className="sep">/</span>
            <span className="cur">Галерея</span>
          </nav>

          <div className="ph-grid">
            <h1 className="ph-title">
              <span className="thin">Архів цеху · 2014 – 2026</span>
              Галерея <span className="accent">робіт.</span>
            </h1>

            <div className="ph-meta">
              <p>
                Кожна фотографія — реальне авто з нашого цеху.{" "}
                <strong>Без рендерів, без стокових картинок</strong>. Те, що тримали в руках, фарбували і віддавали власникам.
              </p>
              <div className="ph-counters">
                <div>
                  <span className="v">147<small>+</small></span>
                  <span className="l">Проєктів<br />в архіві</span>
                </div>
                <div>
                  <span className="v">42<small>цьогор.</small></span>
                  <span className="l">Завершено<br />у 2025–26</span>
                </div>
                <div>
                  <span className="v">12<small>років</small></span>
                  <span className="l">Архіву<br />фото</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ TOOLBAR ══════════════════════════════════════ */}
      <nav className="toolbar" aria-label="Фільтри галереї">
        <div className="container">
          <span className="lbl">// Фільтр</span>
          <div className="filters" role="tablist">
            {FILTERS.map(f => (
              <button
                key={f.key}
                className={`gal-filter${activeFilter === f.key ? " is-active" : ""}`}
                onClick={() => changeFilter(f.key)}
                role="tab"
                aria-selected={activeFilter === f.key}
              >
                {f.label}<span className="count">{f.count}</span>
              </button>
            ))}
          </div>
          <div className="view" role="tablist" aria-label="Вид">
            <button
              className={`view-btn${activeView === "grid" ? " is-active" : ""}`}
              onClick={() => switchView("grid")}
              aria-label="Сітка"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="square">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
            </button>
            <button
              className={`view-btn${activeView === "list" ? " is-active" : ""}`}
              onClick={() => switchView("list")}
              aria-label="Список"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="square">
                <path d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ══ FEATURED SCANNER ═════════════════════════════ */}
      <section className="featured">
        <div className="container">
          <div className="featured-head">
            <div className="left">
              <div className="eyebrow">
                <span className="bar" aria-hidden></span>
                <span className="num">FT</span>
                <span>Featured · interactive</span>
              </div>
              <h2>Тягніть лінію — <span className="accent">сканер «до/після».</span></h2>
            </div>
            <div className="right">
              <span><span className="dot">●</span> Live · interactive</span>
              <span>BMW M3 · 2021 · повне фарбування</span>
            </div>
          </div>

          <div
            className="scanner"
            ref={scannerRef}
            aria-label="Перетягніть лінію щоб порівняти до/після"
          >
            <div className="layer before">
              <span className="ph-layer">BMW M3 · Before · Copart NJ</span>
            </div>
            <div className="layer after" ref={afterLayerRef}>
              <span className="ph-layer">BMW M3 · After · NICE.car.if</span>
            </div>

            <span className="label before">Before · Copart NJ</span>
            <span className="label after">After · NICE.car.if</span>

            <div className="scan-line" ref={scanLineRef}></div>
            <button className="handle" ref={handleRef} aria-label="Перетягнути сканер">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="square">
                <path d="M9 6 L4 12 L9 18 M15 6 L20 12 L15 18"/>
              </svg>
            </button>

            <div className="scan-meta">
              <span className="dot">●</span>
              Scanning · <span>{scanPercent}%</span>
            </div>
            <div className="scan-instr">Пересуньте лінію</div>
          </div>

          <div className="scanner-info">
            <div><span className="lbl">// Проєкт</span><span className="v">BMW M3 Competition</span></div>
            <div><span className="lbl">// Робота</span><span className="v accent">Повне фарбування</span></div>
            <div><span className="lbl">// Час у цеху</span><span className="v mono">22 дні</span></div>
            <div><span className="lbl">// Колір</span><span className="v mono">Frozen Black</span></div>
          </div>
        </div>
      </section>

      {/* ══ GALLERY GRID ═════════════════════════════════ */}
      <section className={`gallery${isListView ? " is-list" : ""}`} id="gallery">
        <div className="container">

          {/* BENTO grid — <div> instead of <a href="#"> */}
          <div className="gallery-grid" id="gallery-grid">
            {GRID_ITEMS.map(item => (
              <div
                key={item.id}
                className={`gi ${item.sz}${item.hero ? " with-corners" : ""}${isHidden(item.cat) ? " is-hidden" : ""}`}
                data-cat={item.cat}
              >
                <span className="tag">{item.tag}</span>
                <span className="gi-id">{item.num}</span>
                <span className="ph-gi">{item.ph}</span>
                <div className="info">
                  <h3>{item.title}</h3>
                  <span className="sub">
                    {item.hero
                      ? <><span className="acc">Featured ·</span> {item.sub.replace(/^Featured · /, "")}</>
                      : item.sub}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* LIST view — <div> instead of <a href="#"> */}
          <ol className="gallery-list" id="gallery-list">
            {LIST_ROWS.map(row => (
              <li key={row.id}>
                <div
                  className={`gl-row${activeFilter !== "all" && activeFilter !== row.cat ? " is-hidden" : ""}`}
                  data-cat={row.cat}
                >
                  <div className="gl-thumb">
                    <span className="ph-thumb">{row.ph}</span>
                  </div>
                  <span className="gl-title">{row.title}</span>
                  <span className="gl-cat">{row.catLabel}</span>
                  <span className="gl-meta">{row.meta}</span>
                  <span className="gl-id">{row.num}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ══ SPECS BAR ════════════════════════════════════ */}
      <section className="specs">
        <div className="container">
          <div className="specs-grid">
            <div><span className="v">147<small>+</small></span><span className="l">Завершених<br />проєктів</span></div>
            <div><span className="v">38<small>тиж</small></span><span className="l">Середня<br />зайнятість</span></div>
            <div><span className="v">12<small>кольор.</small></span><span className="l">Ксиралік-кольорів<br />у роботі</span></div>
            <div><span className="v">100<small>%</small></span><span className="l">Реальні фото<br />з цеху</span></div>
          </div>
        </div>
      </section>

      {/* ══ TIMELINE ═════════════════════════════════════ */}
      <section className="timeline">
        <div className="container">
          <header className="timeline-head">
            <div>
              <div className="eyebrow">
                <span className="bar" aria-hidden></span>
                <span className="num">05</span>
                <span>Case timeline · 2025–26</span>
              </div>
              <h2>Свіжі <span className="accent">історії</span> з цеху</h2>
            </div>
            <p>3 проєкти, які забрали власники за останні 4 місяці. Кожен — приклад «не поспішаємо».</p>
          </header>

          <div className="timeline-track">
            {TL_ITEMS.map((item, i) => (
              <article className="tl-item" key={i}>
                <div className="tl-meta">
                  <span className="date">{item.date}</span>
                  <h3>{item.title}</h3>
                  <span className="car">{item.car}</span>
                  <p>{item.body}</p>
                  <div className="tl-tags">
                    {item.tags.map((t, j) => <span key={j} className="tl-tag">{t}</span>)}
                  </div>
                </div>
                <div className="tl-media">
                  {item.frames.map((f, j) => (
                    <div key={j} className={f.cls}>
                      <span className="frame-lbl">{f.lbl}</span>
                      <span className="ph-tl">{f.ph}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="cta-block">
            <p className="k">// Маєте подібний випадок?</p>
            <h2>Покажіть фото — <span className="accent">скажемо як зробимо.</span></h2>
            <p>
              Надішліть кілька кадрів з різних кутів. Власник особисто подивиться, дасть чесну вилку цін і часу.
            </p>
            <div className="cta-buttons">
              <a href={CONTACTS.telegram} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
                <svg className="ico" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span>Оцінити по фото в Telegram</span>
              </a>
              <a href={CONTACTS.viber} className="btn btn--ghost">
                <svg className="ico" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.4 0C6 0 3 3 3 3S0 6 0 11.4c0 4.3 2.4 8.2 6.3 10.2l-.4 2.4 2.5-1.3c1 .3 2 .4 3 .4 5.4 0 11.4-3.8 11.4-11.7C22.8 5.4 18.6 0 11.4 0zm5.2 17.2s-.4.5-1.2.5c-3.8 0-6.4-1.8-8.5-4-.8-.9-1.5-2-2-3.1-.4-.9-.4-1.4-.4-1.4 0-.8.5-1.2.5-1.2l.6-.7c.3-.3.4-.7.3-1.1l-.7-2c-.2-.5-.6-.8-1.1-.8-.9 0-1.5.7-1.5.7C1.2 4.7 2 7.3 4 9.7c2 2.4 4.5 4.3 7.3 5.3 1.3.5 2.6.7 3.8.7.8 0 1.5-.2 2.1-.5.6-.4 1-1 1-1 .5-1.1-.3-1.7-.3-1.7l-1.3-1c-.4-.3-.8-.3-1.2 0z"/>
                </svg>
                <span>Оцінити в Viber</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
      <FloatingCallButton />
    </>
  );
}
