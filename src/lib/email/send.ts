import "server-only";

type Email = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Sends through Resend. Without an API key it does nothing, so development and
 * tests never send real email.
 */
export async function sendEmail(email: Email): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, ...email }),
    });

    return response.ok;
  } catch {
    // A failed notification must not fail the action that triggered it.
    return false;
  }
}
