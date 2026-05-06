"use client";

import { useRef } from "react";
import { Camera, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export const PHOTO_SLOTS = [
  { key: "front",    label: "Перед",      required: true },
  { key: "back",     label: "Зад",        required: true },
  { key: "left",     label: "Лівий бік",  required: true },
  { key: "right",    label: "Правий бік", required: true },
  { key: "odometer", label: "Пробіг",     required: false },
  { key: "fuel",     label: "Паливо",     required: false },
] as const;

export interface PhotoSlotState {
  key: string;
  label: string;
  required: boolean;
  existingUrl?: string;
  file?: File;
  preview?: string;
}

export function initSlots(): PhotoSlotState[] {
  return PHOTO_SLOTS.map((s) => ({ ...s }));
}

interface PhotoActUploaderProps {
  slots: PhotoSlotState[];
  onChange: (slots: PhotoSlotState[]) => void;
  requiredCount?: number;
}

export function PhotoActUploader({
  slots,
  onChange,
  requiredCount = 4,
}: PhotoActUploaderProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function handleFileChange(key: string, file: File) {
    const preview = URL.createObjectURL(file);
    onChange(slots.map((s) => (s.key === key ? { ...s, file, preview } : s)));
  }

  function handleRemove(key: string) {
    onChange(
      slots.map((s) =>
        s.key === key ? { ...s, file: undefined, preview: undefined, existingUrl: undefined } : s
      )
    );
  }

  const filledRequired = slots.filter((s) => s.required && (s.file || s.existingUrl)).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {slots.map((slot) => {
          const hasPhoto = !!(slot.file || slot.existingUrl);
          const imgSrc = slot.preview ?? slot.existingUrl;

          return (
            <div key={slot.key} className="flex flex-col gap-1">
              {/* Tile */}
              <button
                type="button"
                onClick={() => inputRefs.current[slot.key]?.click()}
                className={cn(
                  "relative flex aspect-[4/3] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors",
                  hasPhoto
                    ? "border-transparent"
                    : slot.required
                    ? "border-orange-300 bg-orange-50 hover:bg-orange-100"
                    : "border-border bg-muted/40 hover:bg-muted"
                )}
              >
                {hasPhoto && imgSrc ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgSrc}
                      alt={slot.label}
                      className="absolute inset-0 h-full w-full rounded-xl object-cover"
                    />
                    {/* Retake overlay */}
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-colors hover:bg-black/40">
                      <RotateCcw className="size-6 text-white opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100" />
                    </div>
                  </>
                ) : (
                  <>
                    <Camera
                      className={cn(
                        "mb-1 size-7",
                        slot.required ? "text-orange-400" : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-medium",
                        slot.required ? "text-orange-600" : "text-muted-foreground"
                      )}
                    >
                      {slot.label}
                    </span>
                    {slot.required && (
                      <span className="mt-0.5 text-[10px] text-orange-400">обов&apos;язково</span>
                    )}
                  </>
                )}
              </button>

              {/* Label + remove */}
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs text-muted-foreground">{slot.label}</span>
                {hasPhoto && (
                  <button
                    type="button"
                    onClick={() => handleRemove(slot.key)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Видалити
                  </button>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={(el) => { inputRefs.current[slot.key] = el; }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(slot.key, file);
                  e.target.value = "";
                }}
              />
            </div>
          );
        })}
      </div>

      {/* "From gallery" button for multiple at once */}
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted">
        <Camera className="size-4" />
        З галереї (кілька фото)
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            let updated = [...slots];
            for (const file of files) {
              const emptySlot = updated.find((s) => !s.file && !s.existingUrl);
              if (!emptySlot) break;
              const preview = URL.createObjectURL(file);
              updated = updated.map((s) =>
                s.key === emptySlot.key ? { ...s, file, preview } : s
              );
            }
            onChange(updated);
            e.target.value = "";
          }}
        />
      </label>

      {/* Progress indicator */}
      <p className={cn("text-center text-sm", filledRequired >= requiredCount ? "text-green-700 font-medium" : "text-muted-foreground")}>
        {filledRequired >= requiredCount
          ? `✓ ${filledRequired} фото додано — можна зберегти`
          : `Додайте ще ${requiredCount - filledRequired} обов’язкових фото`}
      </p>
    </div>
  );
}
