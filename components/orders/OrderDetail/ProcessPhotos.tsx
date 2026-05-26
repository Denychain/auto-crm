"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ImagePlus, Loader2, Check, X, Send, ZoomIn } from "lucide-react";
import { PhotoType, type OrderPhoto } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { viberLink, telegramLinkByPhone, smsLink, tplProcessUpdate } from "@/lib/messenger";
import { deletePhoto } from "@/app/(crm)/orders/[id]/actions";

interface ProcessPhotosProps {
  orderId: string;
  initialPhotos: OrderPhoto[];
  clientPhone: string;
  clientName: string;
}

// ── Photo grid ────────────────────────────────────────────────────────────────

function PhotoGrid({
  photos,
  onDelete,
  onLightbox,
  onSend,
  isPending,
}: {
  photos: OrderPhoto[];
  onDelete: (photoId: string) => void;
  onLightbox: (photo: OrderPhoto) => void;
  onSend: (photo: OrderPhoto) => void;
  isPending: boolean;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function handleDeleteClick(photoId: string) {
    if (confirmId === photoId) {
      onDelete(photoId);
      setConfirmId(null);
    } else {
      setConfirmId(photoId);
    }
  }

  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="group relative overflow-hidden rounded-lg bg-muted"
          style={{ aspectRatio: "4/3" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={photo.description ?? "Фото замовлення"}
            className="h-full w-full cursor-zoom-in object-cover"
            onClick={() => onLightbox(photo)}
          />

          {/* Confirm overlay */}
          {confirmId === photo.id ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
              <p className="text-xs font-medium text-white">Видалити?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDeleteClick(photo.id)}
                  disabled={isPending}
                  className="flex items-center gap-1 rounded-md bg-red-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-600"
                >
                  <Check className="size-3" />
                  Так
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  disabled={isPending}
                  className="flex items-center gap-1 rounded-md bg-white/20 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/30"
                >
                  <X className="size-3" />
                  Ні
                </button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "absolute inset-x-0 top-0 flex justify-end gap-1 p-1.5",
                "opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100",
                "sm:opacity-0 opacity-100"
              )}
            >
              {/* Send to client */}
              <button
                onClick={() => onSend(photo)}
                disabled={isPending}
                className="rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                aria-label="Надіслати клієнту"
              >
                <Send className="size-3" />
              </button>
              {/* Zoom */}
              <button
                onClick={() => onLightbox(photo)}
                disabled={isPending}
                className="rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                aria-label="Переглянути"
              >
                <ZoomIn className="size-3" />
              </button>
              {/* Delete */}
              <button
                onClick={() => handleDeleteClick(photo.id)}
                disabled={isPending}
                className="rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                aria-label="Видалити фото"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          )}

          {/* Caption */}
          {photo.description && (
            <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-xs text-white">
              {photo.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProcessPhotos({
  orderId,
  initialPhotos,
  clientPhone,
  clientName,
}: ProcessPhotosProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lightboxPhoto, setLightboxPhoto] = useState<OrderPhoto | null>(null);
  const [sendPhoto, setSendPhoto] = useState<OrderPhoto | null>(null);

  const actInPhotos = initialPhotos.filter((p) => p.type === PhotoType.ACT_IN);
  const processPhotos = initialPhotos.filter((p) => p.type === PhotoType.PROCESS);

  function handleDelete(photoId: string) {
    startTransition(async () => {
      await deletePhoto(photoId, orderId);
      router.refresh();
    });
  }

  const sendMessage = tplProcessUpdate(sendPhoto?.description ?? "роботи");
  const viberHref = viberLink(clientPhone, sendMessage);
  const tgHref = telegramLinkByPhone(clientPhone);
  const smsHref = smsLink(clientPhone, sendMessage);

  return (
    <>
      {/* ACT_IN section */}
      {actInPhotos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Акт прийомки
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({actInPhotos.length})
                </span>
              </CardTitle>
              {isPending && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <PhotoGrid
              photos={actInPhotos}
              onDelete={handleDelete}
              onLightbox={setLightboxPhoto}
              onSend={setSendPhoto}
              isPending={isPending}
            />
          </CardContent>
        </Card>
      )}

      {/* PROCESS section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Фото процесу
              {processPhotos.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({processPhotos.length})
                </span>
              )}
            </CardTitle>
            {isPending && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {processPhotos.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Фото ще не додані
            </p>
          ) : (
            <PhotoGrid
              photos={processPhotos}
              onDelete={handleDelete}
              onLightbox={setLightboxPhoto}
              onSend={setSendPhoto}
              isPending={isPending}
            />
          )}

          {/* Upload placeholder */}
          <Button
            variant="outline"
            className="w-full gap-2 text-muted-foreground"
            disabled
            title="Буде доступно після налаштування Cloudinary"
          >
            <ImagePlus className="size-4" />
            Завантажити фото
            <span className="ml-1 text-xs">(незабаром)</span>
          </Button>
        </CardContent>
      </Card>

      {/* Lightbox dialog */}
      <Dialog open={!!lightboxPhoto} onOpenChange={(o) => !o && setLightboxPhoto(null)}>
        <DialogContent className="max-w-3xl p-2">
          {lightboxPhoto && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.description ?? "Фото"}
                className="w-full rounded object-contain"
                style={{ maxHeight: "80vh" }}
              />
              {lightboxPhoto.description && (
                <p className="px-2 py-1 text-center text-sm text-muted-foreground">
                  {lightboxPhoto.description}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Send to client dialog */}
      <Dialog open={!!sendPhoto} onOpenChange={(o) => !o && setSendPhoto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Надіслати клієнту</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Повідомлення для {clientName}:
          </p>
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">{sendMessage}</p>
          <div className="flex flex-col gap-2">
            <a
              href={viberHref}
              className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
            >
              Viber
            </a>
            <a
              href={tgHref}
              target="_blank"
              rel="noopener noreferrer"
              title="Відкриється, якщо встановлений Telegram"
              className="flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-600"
            >
              Telegram
            </a>
            <a
              href={smsHref}
              className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted"
            >
              SMS
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
