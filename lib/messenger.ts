function encode(text: string): string {
  return encodeURIComponent(text);
}

export function viberLink(phone: string, text: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  return `viber://chat?number=${cleanPhone}&text=${encode(text)}`;
}

/**
 * Generates a Telegram deep-link to open a chat by phone number.
 * tg://resolve?phone=... works on devices with Telegram installed.
 */
export function telegramLinkByPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  return `tg://resolve?phone=${clean}`;
}

export function telegramFallbackLink(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  return `https://t.me/+${clean}`;
}

// Keep the old function for sharing text (different use case)
export function telegramLink(text: string): string {
  return `https://t.me/share/url?text=${encode(text)}`;
}

export function smsLink(phone: string, text: string): string {
  return `sms:${phone}?body=${encode(text)}`;
}

export function tplCallToService(clientName: string, time: string): string {
  return `Доброго дня, ${clientName}! Завтра можемо прийняти ваше авто. Чекаємо на ${time}`;
}

export function tplProcessUpdate(stage: string): string {
  return `Ваше авто на стадії "${stage}", працюємо 💪`;
}

export function tplReadyToPickup(clientName: string): string {
  return `${clientName}, авто готове — можете забирати! ✅`;
}

export function tplFeedbackRequest(googleMapsUrl: string): string {
  return `Дякуємо за довіру! Якщо все сподобалось, будемо вдячні за відгук: ${googleMapsUrl} 🙏`;
}

export function tplPostponedFollowup(
  clientName: string,
  vehicle: string
): string {
  return `${clientName}, ваш ${vehicle} ще актуальний для ремонту? Будемо раді допомогти!`;
}
