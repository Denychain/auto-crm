"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { viberLink, telegramLink, smsLink, tplCallToService } from "@/lib/messenger";
import { moveFromBacklogToActive } from "@/app/backlog/actions";

interface CallDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  clientName: string;
  phone: string;
  plateNumber: string;
  make: string;
  model: string;
}

export function CallDialog({
  open,
  onOpenChange,
  orderId,
  clientName,
  phone,
  plateNumber,
  make,
  model,
}: CallDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState("10:00");
  const [moveToActive, setMoveToActive] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayTime = `${time} (${date.slice(8, 10)}.${date.slice(5, 7)})`;
  const [text, setText] = useState(() => tplCallToService(clientName, "10:00"));

  // regenerate template when date/time changes
  function getTemplate() {
    return tplCallToService(clientName, displayTime);
  }

  function handleOpenMessenger(href: string) {
    if (moveToActive) {
      startTransition(async () => {
        await moveFromBacklogToActive(orderId);
        router.refresh();
        window.open(href, "_blank", "noopener,noreferrer");
        onOpenChange(false);
      });
    } else {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (moveToActive) {
      startTransition(async () => {
        await moveFromBacklogToActive(orderId);
        router.refresh();
        onOpenChange(false);
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Викликати клієнта</DialogTitle>
        </DialogHeader>

        {/* Client + vehicle info */}
        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <p className="font-semibold">{clientName}</p>
          <p className="text-muted-foreground">{phone}</p>
          <p className="mt-1 font-mono text-xs font-medium">{plateNumber}</p>
          <p className="text-xs text-muted-foreground">{make} {model}</p>
        </div>

        {/* Date + time */}
        <div className="flex gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-muted-foreground">Дата</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setText(tplCallToService(clientName, `${time} (${e.target.value.slice(8, 10)}.${e.target.value.slice(5, 7)})`));
              }}
              className="h-10"
            />
          </div>
          <div className="flex flex-col gap-1 w-28">
            <label className="text-xs text-muted-foreground">Час</label>
            <Input
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                setText(tplCallToService(clientName, `${e.target.value} (${date.slice(8, 10)}.${date.slice(5, 7)})`));
              }}
              className="h-10"
            />
          </div>
        </div>

        {/* Message text */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Текст повідомлення</label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />
          <button
            type="button"
            onClick={() => setText(getTemplate())}
            className="self-start text-xs text-primary hover:underline"
          >
            Скинути шаблон
          </button>
        </div>

        {/* Move to active checkbox */}
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={moveToActive}
            onChange={(e) => setMoveToActive(e.target.checked)}
            className="size-4 rounded"
          />
          Перевести в роботу (DISASSEMBLY) після виклику
        </label>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="border-violet-300 text-violet-700 hover:bg-violet-50"
            disabled={isPending}
            onClick={() => handleOpenMessenger(viberLink(phone, text))}
          >
            Viber
          </Button>
          <Button
            variant="outline"
            className="border-sky-300 text-sky-700 hover:bg-sky-50"
            disabled={isPending}
            onClick={() => handleOpenMessenger(telegramLink(text))}
          >
            Telegram
          </Button>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenMessenger(smsLink(phone, text))}
          >
            SMS
          </Button>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={handleCopy}
          >
            {copied ? <><Check className="size-4" /> Скопійовано</> : <><Copy className="size-4" /> Копіювати</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
