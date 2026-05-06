"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, CheckCircle2, User, Car } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { uploadImage } from "@/lib/cloudinary";
import {
  searchVehicleByPlate,
  searchClientByPhone,
  createOrderWithPhotos,
} from "@/app/orders/new/actions";
import {
  PhotoActUploader,
  initSlots,
  type PhotoSlotState,
} from "@/components/orders/PhotoActUploader";

const DESCRIPTION_CHIPS = [
  "Фарбування капота",
  "Рихтування дверей",
  "Полірування",
  "Заміна крила",
];

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  step,
  label,
  children,
}: {
  step: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {step}
        </span>
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function NewOrderForm() {
  const router = useRouter();

  // ── step state ───────────────────────────────────────────────────────────
  // Revealed sections: 1 always, 2 if plate not found, 3 once vehicle known, 4 once step3 confirmed
  const [plateStatus, setPlateStatus] = useState<"idle" | "loading" | "found" | "notFound">("idle");
  const [showStep3, setShowStep3] = useState(false);
  const [showStep4, setShowStep4] = useState(false);

  // ── step 1 — plate ───────────────────────────────────────────────────────
  const [plate, setPlate] = useState("");
  const plateSearchedRef = useRef(false);

  // ── found vehicle/client ─────────────────────────────────────────────────
  const [foundVehicle, setFoundVehicle] = useState<{
    id: string; make: string; model: string; year: number | null;
  } | null>(null);
  const [foundClient, setFoundClient] = useState<{
    id: string; name: string; phone: string;
  } | null>(null);

  // ── step 2 — new client + vehicle ────────────────────────────────────────
  const [phone, setPhone] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<"idle" | "loading" | "found" | "notFound">("idle");
  const [clientName, setClientName] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  // ── step 3 — work ────────────────────────────────────────────────────────
  const [description, setDescription] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [advancePayment, setAdvancePayment] = useState("0");

  // ── step 4 — photos ──────────────────────────────────────────────────────
  const [photoSlots, setPhotoSlots] = useState<PhotoSlotState[]>(initSlots);

  // ── saving ───────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  // ── derived ──────────────────────────────────────────────────────────────
  const requiredFilled = photoSlots.filter((s) => s.required && (s.file || s.existingUrl)).length;
  const canSave = requiredFilled >= 4 && !isSaving;

  // ── handlers ─────────────────────────────────────────────────────────────

  async function handlePlateBlur() {
    const clean = plate.trim().toUpperCase();
    if (!clean || plateSearchedRef.current) return;
    plateSearchedRef.current = true;
    setPlate(clean);
    setPlateStatus("loading");
    try {
      const result = await searchVehicleByPlate(clean);
      if (result) {
        setFoundVehicle(result.vehicle);
        setFoundClient(result.client);
        setPhone(result.client.phone);
        setClientName(result.client.name);
        setMake(result.vehicle.make);
        setModel(result.vehicle.model);
        setYear(result.vehicle.year?.toString() ?? "");
        setPlateStatus("found");
        setShowStep3(true);
      } else {
        setPlateStatus("notFound");
      }
    } catch {
      toast.error("Помилка пошуку номера");
      setPlateStatus("idle");
      plateSearchedRef.current = false;
    }
  }

  async function handlePhoneBlur() {
    const clean = phone.trim();
    if (!clean) return;
    setPhoneStatus("loading");
    try {
      const result = await searchClientByPhone(clean);
      if (result) {
        setFoundClient(result);
        setClientName(result.name);
        setPhoneStatus("found");
      } else {
        setPhoneStatus("notFound");
      }
    } catch {
      toast.error("Помилка пошуку клієнта");
      setPhoneStatus("idle");
    }
  }

  function handleStep2Continue() {
    if (!phone.trim() || !make.trim() || !model.trim()) {
      toast.error("Заповніть телефон, марку та модель");
      return;
    }
    setShowStep3(true);
  }

  function handleStep3Continue() {
    if (!estimatedPrice) {
      toast.error("Вкажіть орієнтовну ціну");
      return;
    }
    setShowStep4(true);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const toUpload = photoSlots.filter((s) => s.file);
      const total = toUpload.length;
      setUploadProgress({ done: 0, total });

      let done = 0;
      const uploadedUrls = await Promise.all(
        toUpload.map(async (slot) => {
          const url = await uploadImage(slot.file!);
          done++;
          setUploadProgress({ done, total });
          return url;
        })
      );

      const existingUrls = photoSlots
        .filter((s) => s.existingUrl && !s.file)
        .map((s) => s.existingUrl!);

      const result = await createOrderWithPhotos({
        plate: plate.toUpperCase(),
        make: foundVehicle?.make ?? make,
        model: foundVehicle?.model ?? model,
        year: foundVehicle?.year ?? (year ? parseInt(year) : undefined),
        clientName: foundClient?.name ?? clientName,
        clientPhone: foundClient?.phone ?? phone,
        description: description || undefined,
        estimatedPrice: parseFloat(estimatedPrice) || 0,
        advancePayment: parseFloat(advancePayment) || 0,
        photoUrls: [...existingUrls, ...uploadedUrls],
      });

      router.push(`/orders/${result.orderId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Помилка збереження";
      toast.error(msg);
      setIsSaving(false);
      setUploadProgress(null);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-4 pb-10">
      {/* ── Step 1 — Plate ─────────────────────────────────────────────────── */}
      <Section step={1} label="Номерний знак">
        <div className="relative">
          <Input
            value={plate}
            onChange={(e) => {
              setPlate(e.target.value.toUpperCase());
              plateSearchedRef.current = false;
              setPlateStatus("idle");
              setFoundVehicle(null);
              setFoundClient(null);
              setShowStep3(false);
              setShowStep4(false);
            }}
            onBlur={handlePlateBlur}
            onKeyDown={(e) => e.key === "Enter" && handlePlateBlur()}
            placeholder="AA1234BB"
            autoCapitalize="characters"
            className="h-12 font-mono text-center text-lg uppercase tracking-widest"
            disabled={isSaving}
          />
          {plateStatus === "loading" && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {plateStatus === "found" && (
            <CheckCircle2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-green-600" />
          )}
          {plateStatus === "notFound" && (
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          )}
        </div>

        {/* Found vehicle/client info */}
        {plateStatus === "found" && foundVehicle && foundClient && (
          <div className="rounded-xl border bg-green-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Car className="size-4 shrink-0 text-green-700" />
              <span className="font-medium text-green-900">
                {foundVehicle.make} {foundVehicle.model}
                {foundVehicle.year ? ` (${foundVehicle.year})` : ""}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <User className="size-4 shrink-0 text-green-700" />
              <span className="text-green-800">
                {foundClient.name} · {foundClient.phone}
              </span>
            </div>
          </div>
        )}

        {plateStatus === "notFound" && (
          <p className="text-center text-sm text-muted-foreground">
            Номер не знайдено — заповніть дані нижче
          </p>
        )}
      </Section>

      {/* ── Step 2 — New client + vehicle (only if plate not found) ───────── */}
      {plateStatus === "notFound" && (
        <>
          <Separator />
          <Section step={2} label="Клієнт і авто">
            <div className="flex flex-col gap-3">
              {/* Phone */}
              <div className="relative">
                <Input
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setFoundClient(null);
                    setClientName("");
                    setPhoneStatus("idle");
                  }}
                  onBlur={handlePhoneBlur}
                  placeholder="+380XXXXXXXXX"
                  type="tel"
                  className="h-12"
                  disabled={isSaving}
                />
                {phoneStatus === "loading" && (
                  <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
                {phoneStatus === "found" && (
                  <CheckCircle2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-green-600" />
                )}
              </div>

              {phoneStatus === "found" && foundClient && (
                <div className="rounded-lg border bg-green-50 px-3 py-2 text-sm text-green-800">
                  Клієнт знайдений: <strong>{foundClient.name}</strong>
                </div>
              )}

              {/* Name — hidden if client found */}
              {phoneStatus !== "found" && (
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ім'я клієнта"
                  className="h-12"
                  disabled={isSaving}
                />
              )}

              {/* Vehicle fields */}
              <div className="flex gap-2">
                <Input
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="Марка (BMW)"
                  className="h-12 flex-1"
                  disabled={isSaving}
                />
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Модель (X5)"
                  className="h-12 flex-1"
                  disabled={isSaving}
                />
              </div>
              <Input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Рік (необов'язково)"
                type="number"
                min="1950"
                max="2030"
                className="h-12"
                disabled={isSaving}
              />

              <Button
                type="button"
                size="lg"
                className="h-12 w-full"
                onClick={handleStep2Continue}
                disabled={isSaving}
              >
                Далі
              </Button>
            </div>
          </Section>
        </>
      )}

      {/* ── Step 3 — Work description ──────────────────────────────────────── */}
      {showStep3 && (
        <>
          <Separator />
          <Section step={plateStatus === "notFound" ? 3 : 2} label="Опис роботи та ціна">
            <div className="flex flex-col gap-3">
              {/* Quick chips */}
              <div className="flex flex-wrap gap-2">
                {DESCRIPTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() =>
                      setDescription((prev) =>
                        prev ? `${prev}, ${chip.toLowerCase()}` : chip
                      )
                    }
                    disabled={isSaving}
                    className="rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-40"
                  >
                    + {chip}
                  </button>
                ))}
              </div>

              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Що треба зробити..."
                rows={3}
                disabled={isSaving}
              />

              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Орієнтовна ціна (₴)</label>
                  <Input
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(e.target.value)}
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    className="h-12 text-right text-lg"
                    disabled={isSaving}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Завдаток (₴)</label>
                  <Input
                    value={advancePayment}
                    onChange={(e) => setAdvancePayment(e.target.value)}
                    type="number"
                    min="0"
                    step="50"
                    placeholder="0"
                    className="h-12 text-right text-lg"
                    disabled={isSaving}
                  />
                </div>
              </div>

              {!showStep4 && (
                <Button
                  type="button"
                  size="lg"
                  className="h-12 w-full"
                  onClick={handleStep3Continue}
                  disabled={isSaving}
                >
                  Далі — Фото-акт
                </Button>
              )}
            </div>
          </Section>
        </>
      )}

      {/* ── Step 4 — Photo act ─────────────────────────────────────────────── */}
      {showStep4 && (
        <>
          <Separator />
          <Section step={plateStatus === "notFound" ? 4 : 3} label="Фото-акт прийомки">
            <PhotoActUploader
              slots={photoSlots}
              onChange={setPhotoSlots}
              requiredCount={4}
            />
          </Section>

          <Separator />

          {/* Upload progress */}
          {uploadProgress && uploadProgress.total > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-center text-sm text-muted-foreground">
                Завантаження фото: {uploadProgress.done}/{uploadProgress.total}
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${(uploadProgress.done / uploadProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Save button */}
          <Button
            type="button"
            size="lg"
            className="h-14 w-full text-base"
            onClick={handleSave}
            disabled={!canSave}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                {uploadProgress
                  ? `Завантаження ${uploadProgress.done}/${uploadProgress.total}...`
                  : "Збереження..."}
              </>
            ) : (
              `Зберегти замовлення${requiredFilled < 4 ? ` (потрібно ще ${4 - requiredFilled} фото)` : ""}`
            )}
          </Button>
        </>
      )}
    </div>
  );
}
