import { CONTACTS } from "@/lib/constants";

export function FloatingCallButton() {
  return (
    <a href={`tel:${CONTACTS.phone}`} className="floating-call" aria-label="Подзвонити">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square">
        <path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
      </svg>
    </a>
  );
}
