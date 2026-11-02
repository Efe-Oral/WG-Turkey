/** Off at launch. See docs/decisions.md. Server only. */
export function isPhoneVerificationEnabled(): boolean {
  return process.env.PHONE_VERIFICATION_ENABLED === "true";
}
