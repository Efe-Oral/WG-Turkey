export const MIN_FIRST_MESSAGE = 20;
export const MAX_MESSAGE = 3000;
export const MAX_NEW_CONVERSATIONS_PER_DAY = 20;
export const MIN_SECONDS_BETWEEN_MESSAGES = 5;
export const EMAIL_INTERVAL_MS = 3_600_000;
export const UNREAD_CHANGED_EVENT = "unread-changed";

const SCAM_PATTERN = /kapora|iban|önceden ödeme|ön ödeme/i;

/** Section 5.5: these words earn a small warning above the message. */
export function hasScamWords(text: string): boolean {
  return SCAM_PATTERN.test(text.toLocaleLowerCase("tr-TR"));
}

export function preview(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 120);
}
