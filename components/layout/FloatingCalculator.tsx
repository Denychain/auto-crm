"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Calculator, X, Delete } from "lucide-react";
import { cn } from "@/lib/utils";

type CalcOp = "+" | "-" | "*" | "/" | null;

interface CalcState {
  display: string;
  prev: number | null;
  op: CalcOp;
  waitingForOperand: boolean;
}

const INIT: CalcState = {
  display: "0",
  prev: null,
  op: null,
  waitingForOperand: false,
};

function applyOp(a: number, b: number, op: CalcOp): number {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b !== 0 ? a / b : NaN;
    default:  return b;
  }
}

function fmt(n: number): string {
  if (isNaN(n)) return "Помилка";
  if (!isFinite(n)) return "∞";
  const s = String(parseFloat(n.toPrecision(12)));
  return s.length > 14 ? n.toExponential(6) : s;
}

export function FloatingCalculator() {
  const [open, setOpen]   = useState(false);
  const [calc, setCalc]   = useState<CalcState>(INIT);
  const panelRef          = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* Keyboard support */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleDigit(e.key);
      else if (e.key === ".") handleDot();
      else if (e.key === "+" || e.key === "-" || e.key === "*" || e.key === "/") handleOp(e.key as CalcOp);
      else if (e.key === "Enter" || e.key === "=") handleEquals();
      else if (e.key === "Backspace") handleBackspace();
      else if (e.key === "Escape") { setOpen(false); setCalc(INIT); }
      else if (e.key === "Delete") setCalc(INIT);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, calc]);

  const handleDigit = useCallback((d: string) => {
    setCalc((c) => {
      if (c.waitingForOperand) {
        return { ...c, display: d, waitingForOperand: false };
      }
      const next = c.display === "0" ? d : c.display.length < 14 ? c.display + d : c.display;
      return { ...c, display: next };
    });
  }, []);

  const handleDot = useCallback(() => {
    setCalc((c) => {
      if (c.waitingForOperand) return { ...c, display: "0.", waitingForOperand: false };
      if (c.display.includes(".")) return c;
      return { ...c, display: c.display + "." };
    });
  }, []);

  const handleOp = useCallback((op: CalcOp) => {
    setCalc((c) => {
      const cur = parseFloat(c.display);
      if (c.prev !== null && !c.waitingForOperand) {
        const result = applyOp(c.prev, cur, c.op);
        return { display: fmt(result), prev: result, op, waitingForOperand: true };
      }
      return { ...c, prev: cur, op, waitingForOperand: true };
    });
  }, []);

  const handleEquals = useCallback(() => {
    setCalc((c) => {
      if (c.prev === null || c.op === null) return c;
      const cur = parseFloat(c.display);
      const result = applyOp(c.prev, cur, c.op);
      return { display: fmt(result), prev: null, op: null, waitingForOperand: true };
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setCalc((c) => {
      if (c.waitingForOperand) return c;
      const next = c.display.length > 1 ? c.display.slice(0, -1) : "0";
      return { ...c, display: next };
    });
  }, []);

  const handlePercent = useCallback(() => {
    setCalc((c) => {
      const val = parseFloat(c.display) / 100;
      return { ...c, display: fmt(val), waitingForOperand: true };
    });
  }, []);

  const handleToggleSign = useCallback(() => {
    setCalc((c) => {
      const val = -parseFloat(c.display);
      return { ...c, display: fmt(val) };
    });
  }, []);

  const opLabel = calc.op
    ? { "+": "+", "-": "−", "*": "×", "/": "÷" }[calc.op]
    : "";

  /* ── Layout ── */
  const btnBase =
    "flex items-center justify-center rounded-xl text-base font-medium transition-all active:scale-95 select-none h-11";

  return (
    <div
      ref={panelRef}
      className="fixed bottom-20 left-3 z-[60] md:bottom-6 md:left-auto md:right-3"
    >
      {/* ── Calculator panel ── */}
      {open && (
        <div
          className={cn(
            "mb-3 w-64 rounded-2xl border border-border bg-background shadow-2xl",
            "animate-in fade-in slide-in-from-bottom-4 duration-200",
            // На мобілці FAB зліва → панель теж вирівнюємо вліво
            // На md+ FAB справа → панель вирівнюємо вправо (right-0 за замовч.)
            "left-0 md:left-auto md:right-0"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground">Калькулятор</span>
            <button
              onClick={() => { setOpen(false); setCalc(INIT); }}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Display */}
          <div className="px-3 pb-1 pt-2 text-right">
            <div className="min-h-[1rem] text-[10px] text-muted-foreground">
              {calc.prev !== null ? `${fmt(calc.prev)} ${opLabel}` : " "}
            </div>
            <div
              className={cn(
                "truncate font-mono font-semibold leading-tight",
                calc.display.length > 10 ? "text-lg" : "text-2xl"
              )}
            >
              {calc.display}
            </div>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-4 gap-1.5 p-3">
            {/* Row 1 */}
            <button
              onClick={() => setCalc(INIT)}
              className={cn(btnBase, "bg-muted text-foreground text-sm col-span-1 hover:bg-muted/70")}
            >
              AC
            </button>
            <button
              onClick={handleToggleSign}
              className={cn(btnBase, "bg-muted text-foreground hover:bg-muted/70")}
            >
              +/−
            </button>
            <button
              onClick={handlePercent}
              className={cn(btnBase, "bg-muted text-foreground hover:bg-muted/70")}
            >
              %
            </button>
            <button
              onClick={() => handleOp("/")}
              className={cn(
                btnBase,
                calc.op === "/" && calc.waitingForOperand
                  ? "bg-foreground text-background"
                  : "bg-amber-500 text-white hover:bg-amber-400"
              )}
            >
              ÷
            </button>

            {/* Row 2 */}
            {["7", "8", "9"].map((d) => (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                className={cn(btnBase, "bg-secondary text-foreground hover:bg-secondary/70")}
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => handleOp("*")}
              className={cn(
                btnBase,
                calc.op === "*" && calc.waitingForOperand
                  ? "bg-foreground text-background"
                  : "bg-amber-500 text-white hover:bg-amber-400"
              )}
            >
              ×
            </button>

            {/* Row 3 */}
            {["4", "5", "6"].map((d) => (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                className={cn(btnBase, "bg-secondary text-foreground hover:bg-secondary/70")}
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => handleOp("-")}
              className={cn(
                btnBase,
                calc.op === "-" && calc.waitingForOperand
                  ? "bg-foreground text-background"
                  : "bg-amber-500 text-white hover:bg-amber-400"
              )}
            >
              −
            </button>

            {/* Row 4 */}
            {["1", "2", "3"].map((d) => (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                className={cn(btnBase, "bg-secondary text-foreground hover:bg-secondary/70")}
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => handleOp("+")}
              className={cn(
                btnBase,
                calc.op === "+" && calc.waitingForOperand
                  ? "bg-foreground text-background"
                  : "bg-amber-500 text-white hover:bg-amber-400"
              )}
            >
              +
            </button>

            {/* Row 5 */}
            <button
              onClick={() => handleDigit("0")}
              className={cn(btnBase, "bg-secondary text-foreground hover:bg-secondary/70 col-span-1")}
            >
              0
            </button>
            <button
              onClick={handleDot}
              className={cn(btnBase, "bg-secondary text-foreground hover:bg-secondary/70")}
            >
              ,
            </button>
            <button
              onClick={handleBackspace}
              className={cn(btnBase, "bg-secondary text-foreground hover:bg-secondary/70")}
            >
              <Delete className="size-4" />
            </button>
            <button
              onClick={handleEquals}
              className={cn(btnBase, "bg-amber-500 text-white hover:bg-amber-400")}
            >
              =
            </button>
          </div>
        </div>
      )}

      {/* ── FAB button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Калькулятор"
        className={cn(
          "flex size-12 items-center justify-center rounded-full shadow-lg transition-all active:scale-95",
          open
            ? "bg-foreground text-background"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {open ? <X className="size-5" /> : <Calculator className="size-5" />}
      </button>
    </div>
  );
}
