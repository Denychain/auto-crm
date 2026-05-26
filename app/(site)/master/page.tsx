"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CONTACTS } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/* Data                                                                  */
/* ------------------------------------------------------------------ */

const JOURNEY = [
  {
    year: "2001",
    sub: "початок",
    title: "Учень рихтувальника",
    body: (
      <>
        Перший рік у майстерні дядька. Підмітав підлогу, готував шпаклівку, носив бамперів.{" "}
        <em>Зрозумів</em>, що метал має пам&#x2019;ять — і поспіх вертається тріщинами через рік.
      </>
    ),
    tags: ["Гараж", "Шпатель", "Школа метала"],
  },
  {
    year: "2006",
    sub: "перше авто",
    title: "Перше повне фарбування — самостійно",
    body: (
      <>
        VW Passat B5, темно-синій металік. <strong>Чотири тижні готував</strong>, дві ночі не спав
        перед лаком. Власник через 18 років привозить його до мене на полірування.{" "}
        <em>Цей телефонний дзвінок — найбільша моя нагорода.</em>
      </>
    ),
    tags: ["Passat B5", "Перше повне", "1 клієнт назавжди"],
  },
  {
    year: "2010",
    sub: "навчання",
    title: "Колористика в Польщі",
    body: (
      <>
        Стажування у фарбувальній лабораторії. Тоді й зрозумів різницю між «підібрати схожий колір»
        і <strong>підібрати точний колір</strong>. Привіз додому навички роботи з тришаровими
        перламутрами.
      </>
    ),
    tags: ["Польща", "Колорист", "Pearl"],
  },
  {
    year: "2014",
    sub: "nice.car.if",
    title: "Заснував власний цех",
    body: (
      <>
        Орендував кутове приміщення біля Епіцентру. Поставив одну камеру і стапель з другого
        подружнього господарства. <em>Принцип з першого дня:</em> не беру роботу, яку не зможу
        зробити сам.
      </>
    ),
    tags: ["NICE.car.if v1", "1 камера", "Стапель"],
  },
  {
    year: "2019",
    sub: "розширення",
    title: "Друга камера + лабораторія",
    body: (
      <>
        Великі лоти з США показали — потрібна окрема зона для підготовки. Поставив другу камеру і
        власну колор-лабораторію. <strong>Тепер можемо підбирати Xirallic безпосередньо у цеху.</strong>
      </>
    ),
    tags: ["Лабораторія", "Xirallic", "Друга камера"],
  },
  {
    year: "2023",
    sub: "США під ключ",
    title: "Підключив авто з США",
    body: (
      <>
        Партнер у Копарті, доступ до closed-лотів. <em>Я особисто перевіряю кожне авто до ставки</em>. За
        два роки — 38 одиниць доставлено і відновлено, жодної претензії за прихований дефект.
      </>
    ),
    tags: ["Copart Pro", "IAAI", "38 авто"],
  },
  {
    year: "2026",
    sub: "сьогодні",
    title: "Тут і зараз",
    body: (
      <>
        Беру в роботу <strong>4 авто паралельно</strong>, не більше. Кожне — повний цикл під моїм
        контролем. Не масштабуюсь. <em>Не хочу.</em>
      </>
    ),
    tags: ["4 авто паралельно", "Make it NICE"],
  },
];

const TOOLS = [
  {
    n: "01",
    brand: "SATA · DE",
    name: "SATAjet X 5500 PHASER",
    desc: "Робочий пістолет для перлинових і ксиралік-кольорів. Точне розпилення без муарного ефекту.",
    spec: <>Дюза <strong>1.3 RP</strong> · робочий тиск <strong>2.0 бар</strong></>,
    ph: "Фарбопульт SATA",
  },
  {
    n: "02",
    brand: "USI Italia",
    name: "Spray booth Chronotech 6m",
    desc: "Двокамерна установка з контролем температури та вологості. Ідеально для довгих циклів сушки лаку.",
    spec: <>До <strong>+70 °C</strong> · фільтрація 99.9%</>,
    ph: "Кабіна фарбування",
  },
  {
    n: "03",
    brand: "Car-O-Liner · SE",
    name: "Стапель з лазерним вимірюванням",
    desc: "Витягуємо геометрію кузова з точністю до десятих міліметра. Працюємо з алюмінієм і високоміцними сталями.",
    spec: <>Точність <strong>±0.2 мм</strong> · до 6 точок</>,
    ph: "Стапель з лазерним контролем",
  },
  {
    n: "04",
    brand: "X-Rite · US",
    name: "Спектрофотометр MA-T6+",
    desc: "Сканує колір з 6 кутів. Точний підбір рецепту на старому, вигорілому ЛКП. Жодних здогадок.",
    spec: <>6 кутів · бібліотека <strong>250k+ кольорів</strong></>,
    ph: "Спектрофотометр X-Rite",
  },
  {
    n: "05",
    brand: "Fronius · AT",
    name: "TransSteel 2700 MV / TPS 320i",
    desc: "Інверторний апарат для роботи з тонким металом. Чисті шви на 0.7 мм без пропалень.",
    spec: <>MIG/MAG · до <strong>320 А</strong> · imp. кріплення</>,
    ph: "Зварювальний апарат Fronius",
  },
  {
    n: "06",
    brand: "RUPES · IT",
    name: "BigFoot 21 + Mille Series",
    desc: "Орбітальна полірувальна установка з різними головами. Глибоке полірування без перегріву лаку.",
    spec: <>21 mm орбіта · <strong>4500 rpm</strong></>,
    ph: "Полірувальна машина RUPES",
  },
];

const QUOTES = [
  { text: <>Якщо ви прийшли торгуватись за гривню — ми <em>не зговоримось</em>. Я не торгую якістю.</>, ctx: "// Про ціну" },
  { text: <>Сушка триватиме 12 годин. <em>Я не маркетолог</em>, я не можу її прискорити обіцянками.</>, ctx: "// Про час" },
  { text: <>Менеджер на іншому СТО скаже «зробимо за тиждень». <em>Я скажу — три</em>. Один з нас бреше.</>, ctx: "// Про конкурентів" },
  { text: <>Я не беру в роботу авто, якщо не впевнений, що зможу його <em>повернути ідеальним</em>.</>, ctx: "// Про відмови" },
  { text: <>Підбір ксираліка — це не швидко. <em>Якщо ви поспішаєте</em>, поставлю звичайний металік. Але різниця буде видно.</>, ctx: "// Про колір" },
  { text: <>Мій телефон <em>завжди увімкнений</em>. Якщо щось не так через рік — пишіть. Розберемось.</>, ctx: "// Про гарантію" },
];

/* ------------------------------------------------------------------ */
/* SVG icons (inline, keeps bundle zero-dep)                           */
/* ------------------------------------------------------------------ */
const IcoPaint = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <path d="M12 4 C12 4 8 9 8 12.5 a4 4 0 0 0 8 0 C16 9 12 4 12 4 z" />
  </svg>
);
const IcoColor = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <circle cx="12" cy="12" r="6" /><path d="M12 6 L12 4 M18 12 L20 12 M12 18 L12 20 M6 12 L4 12" />
  </svg>
);
const IcoRecv = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <path d="M4 8 L20 8 L18 18 L6 18 z" /><path d="M9 8 L9 5 L15 5 L15 8" />
  </svg>
);
const IcoLot = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <path d="M4 18 L20 18 M8 18 L8 8 L16 8 L16 18" />
  </svg>
);
const IcoCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="9" />
  </svg>
);
const IcoDisasm = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <rect x="4" y="6" width="16" height="14" /><path d="M4 10 L20 10" />
  </svg>
);
const IcoPrepare = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <path d="M3 12 L21 12 M12 3 L12 21" />
  </svg>
);
const IcoWeld = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <path d="M5 5 L19 19 M19 5 L5 19" />
  </svg>
);
const IcoPolis = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <circle cx="12" cy="12" r="9" /><path d="M8 12 L11 15 L16 9" />
  </svg>
);
const IcoMech = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <path d="M4 8 L8 4 L20 16 L16 20 z" />
  </svg>
);
const IcoPhone = () => (
  <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
    <path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>
);
const IcoTg = () => (
  <svg className="ico" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.94 4.34a1.2 1.2 0 0 0-1.27-.19L3.1 11.31c-.86.35-.83 1.6.05 1.91l4.42 1.53 1.68 5.45a.9.9 0 0 0 1.51.38l2.43-2.41 4.66 3.42a1.2 1.2 0 0 0 1.88-.7l3.16-15.55a1.2 1.2 0 0 0-.45-1z" />
  </svg>
);
const IcoViber = () => (
  <svg className="ico" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C7 2 3 5 3 9.4c0 2.3 1.1 4.3 2.8 5.7l-.6 3.3c-.1.4.4.7.7.5l3-1.7c1 .3 2 .4 3.1.4 5 0 9-3 9-7.4S17 2 12 2z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Page                                                                  */
/* ------------------------------------------------------------------ */

export default function MasterPage() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

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
      {/* ============================================================
          HEADER
          ============================================================ */}
      <header className={`site-header${scrolled ? " is-scrolled" : ""}`} id="header">
        <div className="container">
          <Link href="/" className="logo">
            <span>nice</span><span className="dot">.</span>
            <span>car</span><span className="dot">.</span>
            <span className="accent">if</span>
          </Link>
          <nav className="nav">
            <Link href="/">Головна</Link>
            <Link href="/us-cars">Авто з США</Link>
            <Link href="/gallery">Галерея</Link>
            <Link href="/master" className="active">Про майстра</Link>
            <Link href="/contacts">Контакти</Link>
          </nav>
          <span className="header-divider" aria-hidden="true" />
          <a href={`tel:${CONTACTS.phone}`} className="phone">
            <span className="pulse" aria-hidden="true" />
            +380 99 233 44 20
          </a>
          <button
            className="burger"
            id="burger"
            aria-label="Меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
              <path d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          </button>
        </div>
      </header>

      {/* MOBILE MENU */}
      <div className={`mobile-menu${menuOpen ? " is-open" : ""}`} aria-hidden={!menuOpen}>
        {[
          { href: "/",        label: "Головна",     n: "01 / 05" },
          { href: "/us-cars", label: "Авто з США",  n: "02 / 05" },
          { href: "/gallery", label: "Галерея",     n: "03 / 05" },
          { href: "/master",  label: "Про майстра", n: "04 / 05" },
          { href: "/contacts",label: "Контакти",    n: "05 / 05" },
        ].map(({ href, label, n }) => (
          <Link key={href} href={href} onClick={() => setMenuOpen(false)}>
            <span>{label}</span><span className="num">{n}</span>
          </Link>
        ))}
      </div>

      {/* ============================================================
          01 HERO PORTRAIT
          ============================================================ */}
      <section className="ms-hero">
        <div className="hero-bg" aria-hidden="true">
          <span className="ms-img-slot">[ Майстер у цеху — портрет з відблиском світла ]</span>
        </div>
        <div className="hero-grain" aria-hidden="true" />

        <span className="personal-stamp" aria-hidden="true">
          Owner<br />Hands
          <small>Особисто · 25 років у ремеслі</small>
        </span>

        <div className="hero-inner">
          <div className="container">
            <div className="ms-hero-content">

              <div>
                <nav className="breadcrumb" aria-label="Шлях">
                  <Link href="/">Головна</Link>
                  <span className="sep">/</span>
                  <span className="cur">Про майстра</span>
                </nav>
                <h1 className="hero-title">
                  <span className="thin">Не менеджер. Не дилер. Майстер.</span>
                  Я <span className="accent">особисто</span> фарбую ваше авто.
                </h1>
              </div>

              <aside className="id-panel" aria-label="Картка майстра">
                <div className="who">
                  <span className="name">[ Ім&#x2019;я ]</span>
                  <span className="role">// Власник · Колорист</span>
                </div>
                <div className="specs">
                  <div><span className="k">// У ремеслі</span><span className="v accent">25 років</span></div>
                  <div><span className="k">// Заснував цех</span><span className="v mono">2014</span></div>
                  <div><span className="k">// Місто</span><span className="v">Івано-Франківськ</span></div>
                  <div><span className="k">// Спеціалізація</span><span className="v mono">Pearl · Xirallic</span></div>
                  <div><span className="k">// Робить особисто</span><span className="v">Фарбування · Підбір</span></div>
                  <div><span className="k">// Принцип</span><span className="v accent">Якість &gt; Швидкість</span></div>
                </div>
                <div className="sig">
                  <span className="stamp" aria-hidden="true">N</span>
                  <div className="text">
                    <strong>Make it NICE.</strong>
                    <span>Особиста відповідальність на кожному авто.</span>
                  </div>
                </div>
              </aside>

            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          02 STATS
          ============================================================ */}
      <section className="ms-stats">
        <div className="container">
          <div className="ms-stats-grid">
            <div>
              <span className="sv">25<small>років</small></span>
              <span className="sl">Особистого<br />досвіду</span>
            </div>
            <div>
              <span className="sv">147<small>+</small></span>
              <span className="sl">Проєктів<br />пройшло крізь руки</span>
            </div>
            <div>
              <span className="sv">12<small>років</small></span>
              <span className="sl">Цеху<br />NICE.car.if</span>
            </div>
            <div>
              <span className="sv">100<small>%</small></span>
              <span className="sl">Фарбування —<br />сам</span>
            </div>
            <div>
              <span className="sv">12<small>ксир.</small></span>
              <span className="sl">Складних кольорів<br />у роботі</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          03 MANIFESTO
          ============================================================ */}
      <section className="sec">
        <div className="container">
          <header className="sec-head">
            <div>
              <div className="eyebrow">
                <span className="bar" />
                <span className="num">03</span>
                <span>Manifesto · з перших уст</span>
              </div>
              <h2 className="sec-title">Чому я <span className="accent">досі</span> тримаю шпатель</h2>
            </div>
            <p className="sec-intro">
              Більшість колег у моєму віці вже сидять у кабінеті і керують. Я й досі стою біля авто,
              бо тільки так знаю, що результат буде «nice».
            </p>
          </header>

          <div className="ms-manifesto">

            <div className="manifesto-photo ct-corners">
              <span className="ms-img-slot">[ Майстер у масці фарбувальника / руки на крилі ]</span>
            </div>

            <div className="manifesto-text">
              <div className="quote-mark" aria-hidden="true">„</div>

              <h2>Я бачу авто <span className="accent">руками</span>, а не очима.</h2>

              <p>
                Менеджер дивиться на фото і каже клієнту «зробимо». Майстер бере деталь, проводить
                долонею проти зерна металу — і вже знає, скільки шарів шпаклівки накладали попередні
                «спеціалісти».
              </p>

              <p>
                За <strong>25 років</strong> я бачив, як в індустрію зайшов конвеєр. Великі сервіси
                з білими халатами і CRM. Я не проти прогресу — але{" "}
                <em>колір не підбирається в Excel</em>. Колір підбирає людина, яка чує запах
                розчинника і знає, як він поведеться в нашій вологості.
              </p>

              <p>
                Тому я не масштабуюсь і не наймаю «фарбувальника номер 2». В{" "}
                <strong>NICE.car.if</strong> працює моя команда, але{" "}
                <em>пістолет тримаю я</em>. Це не PR-хід. Це єдиний спосіб, який я знаю, як
                гарантувати результат.
              </p>

              <div className="manifesto-divider" />

              <ul className="principles">
                {[
                  {
                    n: "01",
                    title: "Спочатку — фізика",
                    desc: "Лак тверднути 12 годин — це не маркетинг, а хімія. Я чекаю.",
                  },
                  {
                    n: "02",
                    title: "Тільки реальний колір",
                    desc: "Жодного фарбування «по коду VIN». Знімаю лючок і веду в лабораторію.",
                  },
                  {
                    n: "03",
                    title: "Без фотошопу до/після",
                    desc: "Всі фото — реальні, без ретуші. Якщо щось видно під сонцем — переробляю.",
                  },
                  {
                    n: "04",
                    title: "Чесна вилка вартості",
                    desc: "Не «накручую» — даю діапазон і пояснюю, від чого ціна повзе вгору.",
                  },
                ].map(({ n, title, desc }) => (
                  <li key={n}>
                    <span className="n">{n}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          04 JOURNEY — career timeline
          ============================================================ */}
      <section className="sec sec--dark">
        <div className="container">
          <header className="sec-head">
            <div>
              <div className="eyebrow">
                <span className="bar" />
                <span className="num">04</span>
                <span>Career · 25 років у ремеслі</span>
              </div>
              <h2 className="sec-title">Шлях у <span className="accent">ремесло</span></h2>
            </div>
            <p className="sec-intro">
              Від учня в гаражі до власного цеху. Кілька важливих років, які зробили мене тим,
              ким я є сьогодні.
            </p>
          </header>

          <div className="journey">
            {JOURNEY.map(({ year, sub, title, body, tags }) => (
              <article key={year} className="j-item">
                <div className="j-year">{year}<small>{sub}</small></div>
                <div className="j-body">
                  <h3>{title}</h3>
                  <p>{body}</p>
                  <div className="j-tags">
                    {tags.map(t => <span key={t}>{t}</span>)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          05 MYHANDS — what I do personally vs delegate
          ============================================================ */}
      <section className="sec">
        <div className="container">
          <header className="sec-head">
            <div>
              <div className="eyebrow">
                <span className="bar" />
                <span className="num">05</span>
                <span>Hands-on · my touch</span>
              </div>
              <h2 className="sec-title">Що в цеху роблю <span className="accent">тільки я</span></h2>
            </div>
            <p className="sec-intro">
              Прозоро, без маркетингу: на що йде моя зміна, а що довіряю команді. Команда теж
              професійна — але це їх роботи, не мої.
            </p>
          </header>

          <div className="myhands">
            {/* Self */}
            <div className="myhands--self">
              <h3><span className="mark">✓</span> Я особисто</h3>
              <ul>
                {[
                  { ico: <IcoPaint />, title: "Фарбування в камері", desc: "Кожен пістолет тримаю я. Без винятків." },
                  { ico: <IcoColor />, title: "Підбір кольору в лабораторії", desc: "Колорист — я. Це не делегується." },
                  { ico: <IcoRecv />,  title: "Прийом авто + оцінка", desc: "Прорахунок ремонту і вилка цін." },
                  { ico: <IcoLot />,   title: "Перевірка лотів на аукціоні", desc: "Огляд кожного US-авто до ставки." },
                  { ico: <IcoCheck />, title: "Фінальний контроль", desc: "Авто не виїде, поки я не подивлюсь під різним світлом." },
                ].map(({ ico, title, desc }) => (
                  <li key={title}>
                    <span className="ico">{ico}</span>
                    <div className="body">
                      <h4>{title}</h4>
                      <p>{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Team */}
            <div className="myhands--team">
              <h3><span className="mark">·</span> Команда (під моїм наглядом)</h3>
              <ul>
                {[
                  { ico: <IcoDisasm />,  title: "Розбірка / збірка авто",    desc: "Помічник з 8-річним стажем." },
                  { ico: <IcoPrepare />, title: "Підготовка поверхні",       desc: "Шпаклівка + ґрунт + матування." },
                  { ico: <IcoWeld />,    title: "Зварювальні роботи",        desc: "Окремий зварник, аргон + кисень." },
                  { ico: <IcoPolis />,   title: "Полірування",               desc: "Детейлер з власним обладнанням." },
                  { ico: <IcoMech />,    title: "Слюсарка",                  desc: "Ходова, мастила — окремий слюсар." },
                ].map(({ ico, title, desc }) => (
                  <li key={title}>
                    <span className="ico">{ico}</span>
                    <div className="body">
                      <h4>{title}</h4>
                      <p>{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          06 TOOLS — equipment showcase
          ============================================================ */}
      <section className="sec sec--dark">
        <div className="container">
          <header className="sec-head">
            <div>
              <div className="eyebrow">
                <span className="bar" />
                <span className="num">06</span>
                <span>Tools · arsenal</span>
              </div>
              <h2 className="sec-title">Інструменти, з якими <span className="accent">не халтуриш</span></h2>
            </div>
            <p className="sec-intro">
              Я вірю в добру техніку. На дешевому пістолеті{" "}
              <strong>не зробиш</strong> ідеальний перехід на тришаровому перламутрі.
            </p>
          </header>

          <div className="tools-grid">
            {TOOLS.map(({ n, brand, name, desc, spec, ph }) => (
              <article key={n} className="tool">
                <div className="tool-media">
                  <span className="badge">// Tool {n}</span>
                  <span className="ms-img-slot">{ph}</span>
                </div>
                <div className="tool-body">
                  <span className="brand">{brand}</span>
                  <h3>{name}</h3>
                  <p>{desc}</p>
                  <div className="tool-spec">{spec}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          07 QUOTES WALL
          ============================================================ */}
      <section className="sec">
        <div className="container">
          <header className="sec-head">
            <div>
              <div className="eyebrow">
                <span className="bar" />
                <span className="num">07</span>
                <span>Quotes · принципи в одному реченні</span>
              </div>
              <h2 className="sec-title">Як <span className="accent">говорю</span> з клієнтами</h2>
            </div>
            <p className="sec-intro">
              Це фрази, які я повторюю на огляді частіше за все. Тут вони зібрані в одному місці.
            </p>
          </header>

          <div className="quotes">
            {QUOTES.map(({ text, ctx }, i) => (
              <article key={i} className="quote">
                <p>{text}</p>
                <span className="ctx">{ctx}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          08 SIGNATURE — personal CTA
          ============================================================ */}
      <section className="signature">
        <div className="container">
          <div className="sig-grid">

            <div className="sig-portrait">
              <span className="ms-img-slot" style={{ borderRadius: "50%", fontSize: "10px" }}>
                [ Майстер — портрет ]
              </span>
            </div>

            <div className="sig-body">
              <span className="k">// Особисто від мене</span>
              <h2>Якщо ви дочитали — <span className="accent">напишіть.</span></h2>
              <p>
                Я не люблю довгі тексти про себе. Якщо вам близько те, що тут написано — давайте
                поговоримо про ваше авто. На дзвінок чи у месенджер.{" "}
                <strong>Я завжди відповідаю сам</strong>, без секретарів.
              </p>
              <div className="sig-buttons">
                <a href={`tel:${CONTACTS.phone}`} className="btn btn--primary">
                  <IcoPhone />
                  +380 99 233 44 20
                </a>
                <a href={CONTACTS.telegram} className="btn btn--ghost" target="_blank" rel="noreferrer">
                  <IcoTg />
                  Telegram
                </a>
                <a href={CONTACTS.viber} className="btn btn--ghost" target="_blank" rel="noreferrer">
                  <IcoViber />
                  Viber
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================
          FOOTER (mini)
          ============================================================ */}
      <footer className="site-footer">
        <div className="container">
          <aside className="footer-strip">
            <div className="icon"><span>!</span></div>
            <span className="lbl">Увага</span>
            <p>
              Безкоштовне зберігання готового авто — <strong>3 доби</strong>. Далі нараховується
              плата за стоянку.
            </p>
          </aside>

          <div className="footer-grid-mini">
            <div className="footer-col footer-brand">
              <div className="logo-lg">
                <span>nice</span><span className="dot">.</span>
                <span>car</span><span className="dot">.</span>
                <span className="accent">if</span>
              </div>
              <div className="slogan">Робимо як <em>для себе.</em></div>
            </div>

            <div className="footer-col">
              <h5>Навігація</h5>
              <ul className="footer-nav-mini">
                <li><Link href="/">Головна</Link></li>
                <li><Link href="/us-cars">Авто з США</Link></li>
                <li><Link href="/gallery">Галерея</Link></li>
                <li><Link href="/master">Про майстра</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h5>Зв&#x2019;язок</h5>
              <a href={`tel:${CONTACTS.phone}`} className="footer-phone-mini">+380 99 233 44 20</a>
              <ul className="footer-nav-mini">
                <li><a href={CONTACTS.telegram} target="_blank" rel="noreferrer">Telegram</a></li>
                <li><a href={CONTACTS.viber} target="_blank" rel="noreferrer">Viber</a></li>
                <li><a href={CONTACTS.instagram} target="_blank" rel="noreferrer">Instagram</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h5>Графік</h5>
              <ul className="footer-nav-mini" style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                <li style={{ color: "var(--ink-1)" }}><span>Пн–Пт · {CONTACTS.hours.weekdays}</span></li>
                <li style={{ color: "var(--ink-3)" }}><span>Сб · {CONTACTS.hours.saturday}</span></li>
                <li style={{ color: "var(--ink-3)" }}><span>Нд · {CONTACTS.hours.sunday}</span></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2026 NICE.car.if · Всі права захищено.</span>
            <span>Зроблено в Івано-Франківську.</span>
          </div>
        </div>
      </footer>

      {/* FLOATING CALL (mobile) */}
      <a href={`tel:${CONTACTS.phone}`} className="floating-call" aria-label="Подзвонити">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
          <path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
        </svg>
      </a>
    </>
  );
}
