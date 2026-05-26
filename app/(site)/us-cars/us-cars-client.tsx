"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CONTACTS } from "@/lib/constants";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { FloatingCallButton } from "@/components/site/FloatingCallButton";

/* ── types ─────────────────────────────────────────── */
type LotStatus = "transit" | "repair" | "auction" | "ready";
type FilterKey  = "all" | LotStatus;

interface Lot {
  id: string;
  status: LotStatus;
  statusLabel: string;
  lotNum: string;
  title: string;
  year: string;
  lot: string;
  mileage: string;
  damage: string;
  title_type: string;
  progress: number;
  stages: { label: string; done: boolean; cur: boolean }[];
  price: string;
  priceType: string;
  eta: string;
}

/* ── data ───────────────────────────────────────────── */
const LOTS: Lot[] = [
  {
    id: "lot-1", status: "transit", statusLabel: "В дорозі", lotNum: "LOT · 47821",
    title: "BMW X5 xDrive40i", year: "2020", lot: "Copart · CA", mileage: "62k mi",
    damage: "Front", title_type: "Salvage", progress: 55, price: "$28 400", priceType: "ALL-IN",
    eta: "ETA · 14 днів",
    stages: [
      { label: "Аук.", done: true, cur: false },
      { label: "Ставка", done: true, cur: false },
      { label: "Транзит", done: false, cur: true },
      { label: "Митниця", done: false, cur: false },
      { label: "Цех", done: false, cur: false },
    ],
  },
  {
    id: "lot-2", status: "repair", statusLabel: "На ремонті", lotNum: "LOT · 47711",
    title: "Tesla Model 3 LR AWD", year: "2021", lot: "IAAI · NY", mileage: "41k mi",
    damage: "Side", title_type: "Salvage", progress: 80, price: "$31 900", priceType: "ALL-IN",
    eta: "Видача · 8 днів",
    stages: [
      { label: "Аук.", done: true, cur: false },
      { label: "Ставка", done: true, cur: false },
      { label: "Транзит", done: true, cur: false },
      { label: "Митниця", done: true, cur: false },
      { label: "Цех", done: false, cur: true },
    ],
  },
  {
    id: "lot-3", status: "auction", statusLabel: "На аукціоні", lotNum: "LOT · 47903",
    title: "Audi Q5 Premium Plus", year: "2022", lot: "Copart · FL", mileage: "28k mi",
    damage: "Hail", title_type: "Salvage", progress: 15, price: "~$27 500", priceType: "EST.",
    eta: "Торги · сьогодні",
    stages: [
      { label: "Аук.", done: false, cur: true },
      { label: "Ставка", done: false, cur: false },
      { label: "Транзит", done: false, cur: false },
      { label: "Митниця", done: false, cur: false },
      { label: "Цех", done: false, cur: false },
    ],
  },
  {
    id: "lot-4", status: "transit", statusLabel: "В дорозі", lotNum: "LOT · 47788",
    title: "Ford Mustang GT 5.0", year: "2019", lot: "Copart · TX", mileage: "34k mi",
    damage: "Rear", title_type: "Salvage", progress: 45, price: "$23 800", priceType: "ALL-IN",
    eta: "ETA · 22 дні",
    stages: [
      { label: "Аук.", done: true, cur: false },
      { label: "Ставка", done: true, cur: false },
      { label: "Транзит", done: false, cur: true },
      { label: "Митниця", done: false, cur: false },
      { label: "Цех", done: false, cur: false },
    ],
  },
  {
    id: "lot-5", status: "ready", statusLabel: "Готове", lotNum: "LOT · 47502",
    title: "Honda Accord Sport", year: "2020", lot: "IAAI · IL", mileage: "56k mi",
    damage: "Minor", title_type: "Clean (rebuilt)", progress: 100, price: "$19 200", priceType: "ALL-IN",
    eta: "До видачі",
    stages: [
      { label: "Аук.", done: true, cur: false },
      { label: "Ставка", done: true, cur: false },
      { label: "Транзит", done: true, cur: false },
      { label: "Митниця", done: true, cur: false },
      { label: "Цех", done: true, cur: false },
    ],
  },
  {
    id: "lot-6", status: "repair", statusLabel: "На ремонті", lotNum: "LOT · 47650",
    title: "Toyota RAV4 XLE Premium", year: "2021", lot: "Copart · GA", mileage: "38k mi",
    damage: "Front", title_type: "Salvage", progress: 70, price: "$24 600", priceType: "ALL-IN",
    eta: "Видача · 12 днів",
    stages: [
      { label: "Аук.", done: true, cur: false },
      { label: "Ставка", done: true, cur: false },
      { label: "Транзит", done: true, cur: false },
      { label: "Митниця", done: true, cur: false },
      { label: "Цех", done: false, cur: true },
    ],
  },
];

/* computed filter counts from real LOTS data */
const FILTERS: { key: FilterKey; label: string; count: number }[] = [
  { key: "all",     label: "Всі",         count: LOTS.length },
  { key: "auction", label: "На аукціоні", count: LOTS.filter(l => l.status === "auction").length },
  { key: "transit", label: "У дорозі",    count: LOTS.filter(l => l.status === "transit").length },
  { key: "repair",  label: "На ремонті",  count: LOTS.filter(l => l.status === "repair").length },
  { key: "ready",   label: "Готові",      count: LOTS.filter(l => l.status === "ready").length },
];

const CALC_ROWS = [
  { n: "01", title: "Ставка на аукціоні",          desc: "Виграшна ціна лоту на Copart/IAAI — те, що ми пропонуємо в торгах.",                  amount: "$ 12 400", currency: "USD" },
  { n: "02", title: "Аукційні збори",               desc: "Buyer fee, gate fee, environmental — комісії майданчика.",                              amount: "$ 750",    currency: "USD" },
  { n: "03", title: "Доставка USA → Гданськ",       desc: "Внутрішній тягач до порту + морський контейнер + страховка.",                          amount: "$ 1 850",  currency: "USD" },
  { n: "04", title: "Доставка Гданськ → Франківськ", desc: "Автовоз через кордон + сертифікація.",                                                  amount: "$ 850",    currency: "USD" },
  { n: "05", title: "Розтаможення + акциз + ПДВ",   desc: "Офіційний платіж за формулою МД. Точну цифру дає митний брокер за VIN.",               amount: "$ 4 200",  currency: "~UAH" },
  { n: "06", title: "Кузовний ремонт + фарбування", desc: "За тарифом нашого цеху. Прозорно — за нашим базовим прайсом.",                         amount: "$ 2 800",  currency: "USD" },
  { n: "07", title: "Запчастини",                    desc: "OEM або quality aftermarket — погоджуємо з вами заздалегідь.",                          amount: "$ 1 650",  currency: "USD" },
  { n: "08", title: "Наш сервіс «під ключ»",         desc: "Підбір, оцінка, ведення угоди, координація логістики — фіксована ставка.",             amount: "$ 800",    currency: "USD" },
];

const CASES = [
  {
    tag: "Case · 01", sub: "BMW 3 Series · M Sport · 2021",
    q: "«Думав не врятувати — а ви відновили геометрію за два тижні»",
    p1: "Лот з фронтальним пошкодженням, повна заміна капота і крил. Підбір кольору зайняв 12 днів — сапфірово-чорний з ефектом перламутру. Геометрія витягнута на стапелі.",
    p2: (
      <>Власник придбав авто <strong>дешевше на 38%</strong>, ніж на українському ринку, з повним пакетом документів і нашою гарантією на ремонт.</>
    ),
    stats: [
      { v: "38%", accent: true, l: "Економія\nвід ринку" },
      { v: "14 днів", accent: false, l: "Тривалість\nремонту" },
      { v: "$27.4k", accent: false, l: "Final\nall-in" },
    ],
    before: "BMW 3 · Copart NJ",
    after:  "BMW 3 · NICE.car.if",
  },
  {
    tag: "Case · 02", sub: "Tesla Model Y · Long Range · 2022",
    q: "«Боявся, що пошкоджений акумулятор — виявилося, тільки кузов»",
    p1: "Перевірка на території аукціону врятувала покупця від поганого вибору другого лоту. Model Y оглянули на місці — батарея чиста, пошкодження тільки в зоні бамперу і фари.",
    p2: (
      <>Запчастини OEM з UA-складу, фарбування в металік «Midnight Silver Metallic». <em>Один з найшвидших проектів року</em> — від ставки до видачі за 47 днів.</>
    ),
    stats: [
      { v: "42%", accent: true, l: "Економія\nвід ринку" },
      { v: "47 днів", accent: false, l: "Лот → видача" },
      { v: "$38.6k", accent: false, l: "Final\nall-in" },
    ],
    before: "Tesla Y · IAAI NY",
    after:  "Tesla Y · NICE.car.if",
  },
  {
    tag: "Case · 03", sub: "Ford F-150 Lariat · 2020",
    q: "«Привезли пікап, який в Україні коштує як два»",
    p1: "Великий лот з градом — характерна історія для авто з Техасу. Чотири дні полірування і локального ремонту панелей, тонкі вм'ятини виведені методом PDR.",
    p2: (
      <>Жодного фарбування. Власник отримав <strong>повністю чистий кузов</strong> і пікап з заводським покриттям за українські гроші.</>
    ),
    stats: [
      { v: "48%", accent: true, l: "Економія\nвід ринку" },
      { v: "9 днів", accent: false, l: "Тривалість\nремонту" },
      { v: "$32.1k", accent: false, l: "Final\nall-in" },
    ],
    before: "F-150 · Copart TX",
    after:  "F-150 · NICE.car.if",
  },
];

const FAQ = [
  {
    num: "Q.01", q: "Скільки часу від ставки до моїх рук?",
    a: (
      <>
        <p>Середньо <strong>60–90 днів</strong>: 2–7 днів на пошук → 2 дні аукціон/оплата → 35–55 днів логістика (USA → Гданськ → Франківськ) → 3–7 днів розтаможення → 14–30 днів ремонт.</p>
        <p>Швидкі проєкти (мінімальний ремонт, chassis-clean авто) — <em>близько 50 днів</em>. Складні (HV електро, рідкісні кольори) — до 110.</p>
      </>
    ),
  },
  {
    num: "Q.02", q: "Які гарантії, що я не куплю «кота в мішку»?",
    a: (
      <>
        <p>До ставки ми <strong>особисто</strong> оглядаємо лот (фото + ASR/condition report + Carfax). Прораховуємо вартість ремонту <em>до</em> аукціону і фіксуємо це на папері.</p>
        <p>Якщо приходить лот гірший, ніж задекларовано в аукційному звіті — ми компенсуємо різницю з нашої комісії, а не з вашої кишені.</p>
      </>
    ),
  },
  {
    num: "Q.03", q: "Чи можна купити чисте (non-salvage) авто?",
    a: (
      <>
        <p>Так, можемо брати дилерські авто на Manheim або «clean title» на Copart. Однак зазвичай вони на <strong>15–25%</strong> дорожчі, і економія від США падає.</p>
        <p>Для бюджету $25–50k <em>salvage</em>-лоти з нашим ремонтом дають найкращу комбінацію ціна/якість.</p>
      </>
    ),
  },
  {
    num: "Q.04", q: "Як платити і коли вносити завдаток?",
    a: (
      <>
        <p>Поетапно: <strong>$500</strong> підписали угоду · повна сума лоту перед ставкою · логістика і митниця по факту · ремонт перед видачею.</p>
        <p>Жодних «всі гроші наперед». На кожному етапі ви бачите чек і документ.</p>
      </>
    ),
  },
  {
    num: "Q.05", q: "Що з гарантією після видачі?",
    a: (
      <>
        <p>На <strong>фарбування і кузовний ремонт</strong> — 1 рік гарантії від нашого цеху. На електроніку і агрегати — стандартна гарантія СТО (3 місяці на роботу).</p>
        <p>Сервіс-візити в перший рік — пріоритетне обслуговування. <em>Це ваше авто і наша репутація.</em></p>
      </>
    ),
  },
  {
    num: "Q.06", q: "А якщо я хочу конкретну модель — чи знайдете?",
    a: (
      <>
        <p>Так. Залишаємо <strong>«хочу-лист»</strong> з вашими критеріями (модель, рік, пробіг, бюджет, допустимі пошкодження). Моніторимо нові лоти 5 днів на тиждень.</p>
        <p>Коли з&apos;являється лот, який підходить — пишемо вам із прорахунком. Ви приймаєте рішення <em>за 24 години</em>.</p>
      </>
    ),
  },
];

/* ── component ───────────────────────────────────────── */
export default function UsCarsClient() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [filter, setFilter] = useState<FilterKey>(() => {
    const p = searchParams.get("filter");
    return (FILTERS.some(f => f.key === p) ? (p as FilterKey) : "all");
  });

  function changeFilter(f: FilterKey) {
    setFilter(f);
    const params = new URLSearchParams(searchParams.toString());
    if (f === "all") {
      params.delete("filter");
    } else {
      params.set("filter", f);
    }
    router.replace(`/us-cars${params.toString() ? "?" + params.toString() : ""}`, { scroll: false });
  }

  const visibleLots = filter === "all" ? LOTS : LOTS.filter(l => l.status === filter);

  return (
    <>
      <SiteHeader activePage="us-cars" />

      {/* ══ PAGE HERO ════════════════════════════════════ */}
      <section className="page-hero">
        <div className="ph-bg" aria-hidden={true}></div>
        <div className="ph-grain" aria-hidden={true}></div>

        <span className="us-stamp" aria-hidden={true}>
          USA<br />Import<small>Authorized · Owner-checked</small>
        </span>

        <div className="ph-inner">
          <div className="container">
            <nav className="breadcrumb" aria-label="Шлях">
              <a href="/">Головна</a>
              <span className="sep">/</span>
              <span className="cur">Авто з США</span>
            </nav>

            <div className="ph-headline">
              <h1 className="ph-title">
                <span className="thin">Привеземо · Відремонтуємо · Віддамо ключі</span>
                Авто з США <span className="accent">під ключ.</span>
              </h1>
              <p className="ph-sub">
                Повний цикл від ставки на аукціоні Copart/IAAI до видачі в нашому цеху.{" "}
                <strong>Без посередників</strong> — власник сервісу особисто оцінює кожен лот до покупки.
              </p>
            </div>

            <div className="ph-status">
              <div className="cell live">
                <span className="k">// Лотів зараз</span>
                <span className="v">12<small>activ.</small></span>
              </div>
              <div className="cell">
                <span className="k">// Авто на ремонті</span>
                <span className="v">04<small>cars</small></span>
              </div>
              <div className="cell">
                <span className="k">// В дорозі</span>
                <span className="v">06<small>eta 14d</small></span>
              </div>
              <div className="cell">
                <span className="k">// Доставлено цьогоріч</span>
                <span className="v">38<small>units</small></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PROCESS ══════════════════════════════════════ */}
      <section className="sec sec--dark">
        <div className="container">
          <header className="sec-head">
            <div>
              <div className="eyebrow"><span className="bar" aria-hidden></span><span className="num">02</span><span>Процес · Step by step</span></div>
              <h2 className="sec-title">Як ми <span className="accent">привозимо</span> ваше авто</h2>
            </div>
            <p className="sec-intro">Прозорно на кожному етапі. Ви в курсі: куди дивимось, скільки ставимо, що ремонтуємо.</p>
          </header>

          <div className="proc-grid">
            {[
              { n: "01", meta: "// Підбір лоту",       title: "Аукціон",            timing: "2–7 днів",   ph: "Copart/IAAI · підбір лоту",       body: (<>Шукаємо авто за вашим бюджетом і вимогами. Перевіряємо <strong>Carfax / Autocheck</strong>, фото пошкоджень, історію власників.</>) },
              { n: "02", meta: "// Оцінка майстра",    title: "Прорахунок ремонту", timing: "24 год",     ph: "Лот зблизька — оцінка пошкоджень", body: (<>Власник сервісу <strong>особисто</strong> оцінює фото та live-огляд лоту. Даємо чесну вилку вартості відновлення <em>до</em> ставки.</>) },
              { n: "03", meta: "// Ставка та оплата",  title: "Виграли лот",        timing: "2 дні",      ph: "Авто на аукціоні після виграшу",   body: (<>Робимо ставку згідно стратегії. Після перемоги — оплата лоту і аукційні збори в межах <strong>2 робочих днів</strong>.</>) },
              { n: "04", meta: "// Logistics · Shipping", title: "Доставка",         timing: "35–55 днів", ph: "Контейнер у порту LA / NY",        body: (<>Internal trucking → морський контейнер → Гданськ → автовоз до Франківська. Прозорий <strong>трекінг по контейнеру</strong>.</>) },
              { n: "05", meta: "// Customs · Реєстрація", title: "Розтаможення",    timing: "3–7 днів",   ph: "Розтаможення / зважування",        body: (<>Сплачуємо мито/акциз/ПДВ за чесною формулою. Реєстрація в МВС, видача номерних знаків. <strong>Без сірих схем.</strong></>) },
              { n: "06", meta: "// Ремонт · Видача",   title: "Ключі вам",          timing: "14–30 днів", ph: "Готове авто на видачі в цеху",     body: (<>Кузовний ремонт у нашому цеху, фарбування, повна передпродажна підготовка. <em>Ви забираєте ціле авто, готове до експлуатації.</em></>) },
            ].map((step) => (
              <article className="proc-step" key={step.n}>
                <div className="media">
                  <span className="placeholder">{step.ph}</span>
                </div>
                <div className="body">
                  <div className="num">{step.n}</div>
                  <span className="meta">{step.meta}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <span className="timing">{step.timing}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ══ LIVE LOTS ════════════════════════════════════ */}
      <section className="sec">
        <div className="container">
          <header className="sec-head">
            <div>
              <div className="eyebrow"><span className="bar" aria-hidden></span><span className="num">03</span><span>Live · Активні лоти</span></div>
              <h2 className="sec-title">Що в роботі <span className="accent">просто зараз</span></h2>
            </div>
            <p className="sec-intro">
              Реальні авто на різних стадіях процесу. <strong>Хочете щось схоже?</strong>{" "}
              Напишіть — підкажемо, коли наступний транспорт.
            </p>
          </header>

          <div className="lots-toolbar">
            <span className="label">// Фільтр</span>
            <div className="filters" role="tablist">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`lot-filter${filter === f.key ? " is-active" : ""}`}
                  onClick={() => changeFilter(f.key)}
                  role="tab"
                  aria-selected={filter === f.key}
                >
                  {f.label}<span className="count">{f.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="lots-grid">
            {visibleLots.map(lot => (
              <article key={lot.id} className={`lot s-${lot.status}`} data-status={lot.status}>
                <div className="lot-media">
                  <span className="status">{lot.statusLabel}</span>
                  <span className="lot-id">{lot.lotNum}</span>
                  <span className="ph">{lot.title} · {lot.lot}</span>
                </div>
                <div className="lot-body">
                  <div className="lot-title">
                    <h3>{lot.title}</h3>
                    <span className="year">{lot.year}</span>
                  </div>
                  <div className="lot-spec">
                    <span><span className="lbl">Lot</span><b>{lot.lot}</b></span>
                    <span><span className="lbl">Пробіг</span><b>{lot.mileage}</b></span>
                    <span><span className="lbl">Damage</span><b>{lot.damage}</b></span>
                    <span><span className="lbl">Title</span><b>{lot.title_type}</b></span>
                  </div>
                  <div className="lot-progress">
                    <div className="track"><div className="fill" style={{ width: `${lot.progress}%` }}></div></div>
                    <div className="stages">
                      {lot.stages.map((s, i) => (
                        <span key={i} className={s.done ? "done" : s.cur ? "cur" : ""}>{s.label}</span>
                      ))}
                    </div>
                  </div>
                  <div className="lot-foot">
                    <span className="price">{lot.price} <small>{lot.priceType}</small></span>
                    <span className="eta">{lot.eta}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COST BREAKDOWN ═══════════════════════════════ */}
      <section className="sec sec--dark">
        <div className="container">
          <header className="sec-head">
            <div>
              <div className="eyebrow"><span className="bar" aria-hidden></span><span className="num">04</span><span>Cost breakdown · з чого ціна</span></div>
              <h2 className="sec-title">Чесна <span className="accent">математика</span></h2>
            </div>
            <p className="sec-intro">
              Жодних прихованих рядків. Показуємо приклад розрахунку на типовому авто —{" "}
              <strong>Toyota Camry SE 2020</strong>.
            </p>
          </header>

          <div className="calc-grid">
            <div className="calc-rows">
              {CALC_ROWS.map(row => (
                <div className="calc-row" key={row.n}>
                  <span className="n">{row.n}</span>
                  <div className="body">
                    <h4>{row.title}</h4>
                    <p>{row.desc}</p>
                  </div>
                  <span className="amount">{row.amount} <small>{row.currency}</small></span>
                </div>
              ))}
            </div>

            <aside className="calc-card">
              <span className="k">// Підсумок</span>
              <h3>Toyota Camry SE <em>2020 · 41k mi</em></h3>
              <ul className="breakdown">
                <li><span className="lbl">Лот</span><span className="val">$ 12 400</span></li>
                <li><span className="lbl">Збори + логістика</span><span className="val">$ 3 450</span></li>
                <li><span className="lbl">Розтаможення</span><span className="val">$ 4 200</span></li>
                <li><span className="lbl">Ремонт + запчастини</span><span className="val">$ 4 450</span></li>
                <li><span className="lbl">Сервіс</span><span className="val">$ 800</span></li>
              </ul>
              <div className="total">
                <span className="lbl">Final · all-in</span>
                <span className="val">$25 300</span>
              </div>
              <div className="saved">Ринок UA: ~$ 35 000 · <strong>економія ≈ 30%</strong></div>
            </aside>
          </div>
        </div>
      </section>

      {/* ══ CASE STUDIES ═════════════════════════════════ */}
      <section className="sec">
        <div className="container">
          <header className="sec-head">
            <div>
              <div className="eyebrow"><span className="bar" aria-hidden></span><span className="num">05</span><span>Case studies · реальні історії</span></div>
              <h2 className="sec-title">Привезли. Відремонтували. <span className="accent">Віддали ключі.</span></h2>
            </div>
            <p className="sec-intro">Кілька історій з 2024–2025. Те, як виглядав лот на торгах, і що сів за кермо власник.</p>
          </header>

          {CASES.map((c, i) => (
            <article className="case" key={i}>
              <div className="case-info">
                <span className="case-tag">{c.tag}</span>
                <span className="case-sub">{c.sub}</span>
                <h3>{c.q}</h3>
                <p>{c.p1}</p>
                <p>{c.p2}</p>
                <div className="case-stats">
                  {c.stats.map((s, j) => (
                    <div key={j}>
                      <div className={`v${s.accent ? " accent" : ""}`}>{s.v}</div>
                      <div className="l" style={{ whiteSpace: "pre-line" }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="case-media">
                <div className="case-frame">
                  <span className="lbl before">Before · {c.before}</span>
                  <div className="ph-img">{c.before}</div>
                </div>
                <div className="case-frame">
                  <span className="lbl after">After · {c.after}</span>
                  <div className="ph-img">{c.after}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ══ OWNER AT AUCTION ═════════════════════════════ */}
      <section className="sec sec--dark">
        <div className="container">
          <div className="owner-block">
            <div className="ob-media ct-corners">
              <span className="ph">Власник перевіряє лот · Copart</span>
            </div>
            <div>
              <div className="eyebrow"><span className="bar" aria-hidden></span><span className="num">06</span><span>Killer feature · USP</span></div>
              <h2>Власник <span className="accent">особисто</span> оглядає кожен лот</h2>
              <div className="body">
                <p>Менеджери з продажу <em>не бачили живого авто</em> — їх задача продати каталог. Майстер бачить ремонт за 10 секунд: де гнило, де паяно, де приховано перелом лонжерона.</p>
                <p>Ми не граємо в рулетку. Беремо тільки те, що знаємо як <strong>відновити з гарантією</strong>.</p>
              </div>
              <ul className="owner-list">
                {[
                  <>Перевірка пошкоджень з нашого боку — <strong>безкоштовно</strong></>,
                  <>Доступ до закритих лотів (Copart Pro, IAAI Membership)</>,
                  <>Прорахунок ремонту <em>до</em> покупки — пишемо чорним по білому</>,
                  <>Гарантія, що ремонт буде в нашому цеху, а не «де знайде час»</>,
                ].map((item, i) => (
                  <li key={i}>
                    <span className="check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square">
                        <path d="M5 12l5 5 9-11"/>
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PHOTO WALL ═══════════════════════════════════ */}
      <section className="sec">
        <div className="container">
          <header className="sec-head">
            <div>
              <div className="eyebrow"><span className="bar" aria-hidden></span><span className="num">07</span><span>Photo wall · процес</span></div>
              <h2 className="sec-title">Кадри <span className="accent">з процесу</span></h2>
            </div>
            <p className="sec-intro">Контейнери, аукціони, цех. Те, що зазвичай не показують у вітрину.</p>
          </header>

          <div className="wall" aria-label="Фотогалерея процесу">
            {[
              { cls: "span-2", tag: "Port · Gdańsk",    ph: "Контейнер у порту" },
              { cls: "",       tag: "Copart · CA",       ph: "Лот на аукціоні" },
              { cls: "",       tag: "Lab · колір",       ph: "Підбір фарби" },
              { cls: "",       tag: "Цех · стапель",     ph: "Авто на стапелі" },
              { cls: "span-h", tag: "Container · 40HC",  ph: "Розвантаження контейнера" },
              { cls: "span-v", tag: "Spray booth",       ph: "Фарбувальна камера" },
              { cls: "",       tag: "IAAI · NY",         ph: "Огляд лоту на IAAI" },
              { cls: "",       tag: "Detail · фінал",    ph: "Полірування фінального авто" },
            ].map((item, i) => (
              <div key={i} className={`wall-item${item.cls ? " " + item.cls : ""}`}>
                <span className="ph-wall">{item.ph}</span>
                <span className="tag">{item.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ══════════════════════════════════════════ */}
      <section className="sec sec--dark">
        <div className="container">
          <header className="sec-head">
            <div>
              <div className="eyebrow"><span className="bar" aria-hidden></span><span className="num">08</span><span>FAQ · авто з США</span></div>
              <h2 className="sec-title">Що треба <span className="accent">знати</span></h2>
            </div>
            <p className="sec-intro">Найчастіші питання від тих, хто думає купити перше авто з-за кордону.</p>
          </header>

          <div className="faq-grid">
            {FAQ.map((item, i) => (
              <details key={i} className="faq-item">
                <summary>
                  <span className="num">{item.num}</span>
                  <span className="q">{item.q}</span>
                  <span className="toggle" aria-hidden={true}></span>
                </summary>
                <div className="a">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ════════════════════════════════════ */}
      <section className="sec sec--dark">
        <div className="container">
          <div className="cta-block">
            <p className="k">// Готові обговорити?</p>
            <h2>Ваше нове авто — <span className="accent">наступне в контейнері.</span></h2>
            <p>
              Розкажіть, що шукаєте: модель, рік, бюджет, як швидко. Підкажемо реальну вилку цін і часу — без обіцянок «всё буде ок».
            </p>
            <div className="cta-buttons">
              <a href={CONTACTS.telegram} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
                <svg className="ico" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span>Написати в Telegram</span>
              </a>
              <a href={CONTACTS.viber} className="btn btn--ghost">
                <svg className="ico" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.4 0C6 0 3 3 3 3S0 6 0 11.4c0 4.3 2.4 8.2 6.3 10.2l-.4 2.4 2.5-1.3c1 .3 2 .4 3 .4 5.4 0 11.4-3.8 11.4-11.7C22.8 5.4 18.6 0 11.4 0zm5.2 17.2s-.4.5-1.2.5c-3.8 0-6.4-1.8-8.5-4-.8-.9-1.5-2-2-3.1-.4-.9-.4-1.4-.4-1.4 0-.8.5-1.2.5-1.2l.6-.7c.3-.3.4-.7.3-1.1l-.7-2c-.2-.5-.6-.8-1.1-.8-.9 0-1.5.7-1.5.7C1.2 4.7 2 7.3 4 9.7c2 2.4 4.5 4.3 7.3 5.3 1.3.5 2.6.7 3.8.7.8 0 1.5-.2 2.1-.5.6-.4 1-1 1-1 .5-1.1-.3-1.7-.3-1.7l-1.3-1c-.4-.3-.8-.3-1.2 0z"/>
                </svg>
                <span>Viber</span>
              </a>
              <a href={`tel:${CONTACTS.phone}`} className="btn btn--ghost">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square">
                  <path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>
                </svg>
                <span>+380 99 233 44 20</span>
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
