"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { Modal } from "@/components/ui/Modal";
import { TextInput } from "@/components/ui/TextInput";
import { completeOnboarding } from "@/lib/auth/actions";
import { track } from "@/lib/events/client";
import { createClient } from "@/lib/supabase/client";

const RESEND_SECONDS = 60;
const emailSchema = z.email();

const onboardingSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  consent: z.literal(true),
});
type OnboardingValues = z.infer<typeof onboardingSchema>;

type AuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  needsOnboarding: boolean;
};

type Step = "email" | "code" | "onboarding";

export function AuthModal({
  open,
  onOpenChange,
  onDone,
  needsOnboarding,
}: AuthModalProps) {
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const activeStep: Step = needsOnboarding ? "onboarding" : step;

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
  });

  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(pathname)}`;

  const sendCode = async () => {
    setBusy(true);
    setError(undefined);
    track({ name: "signup_started" });
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: redirectTo() },
    });
    setBusy(false);

    if (sendError) {
      setError(t("sendFailed"));
      return;
    }
    setStep("code");
    setResendIn(RESEND_SECONDS);
  };

  const onEmailSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!emailSchema.safeParse(email).success) {
      setError(t("invalidEmail"));
      return;
    }
    void sendCode();
  };

  const onCodeSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });

    if (verifyError || !data.user) {
      setBusy(false);
      setError(t("invalidCode"));
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, kvkk_consent_at")
      .eq("id", data.user.id)
      .single();

    setBusy(false);
    if (profile?.first_name && profile.kvkk_consent_at) {
      track({ name: "login" });
      setStep("email");
      setCode("");
      onDone();
    } else {
      setStep("onboarding");
    }
  };

  const onOnboardingSubmit = form.handleSubmit(async (values) => {
    setBusy(true);
    setError(undefined);
    const { ok } = await completeOnboarding(values);
    setBusy(false);

    if (!ok) {
      setError(t("saveFailed"));
      return;
    }
    track({ name: "signup_completed" });
    setStep("email");
    onDone();
  });

  const signInWithGoogle = () => {
    void supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
  };

  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

  return (
    <Modal
      title={activeStep === "onboarding" ? t("onboardingTitle") : t("title")}
      closeLabel={common("close")}
      open={open}
      onOpenChange={onOpenChange}
    >
      {activeStep === "email" ? (
        <div className="flex flex-col gap-4">
          <p>{t("subtitle")}</p>
          <form onSubmit={onEmailSubmit} noValidate className="flex flex-col gap-3">
            <TextInput
              label={t("email")}
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={error}
            />
            <Button type="submit" disabled={busy}>
              {t("continue")}
            </Button>
          </form>
          {googleEnabled ? (
            <>
              <p className="flex items-center gap-3 text-meta text-black/60">
                <span className="h-px flex-1 bg-black/12" />
                {t("or")}
                <span className="h-px flex-1 bg-black/12" />
              </p>
              <Button variant="secondary" onClick={signInWithGoogle}>
                {t("google")}
              </Button>
            </>
          ) : null}
          <p className="text-small text-black/60">
            {t.rich("terms", {
              terms: (chunks) => (
                <Link href="/kullanim-sartlari" className="underline">
                  {chunks}
                </Link>
              ),
              kvkk: (chunks) => (
                <Link href="/kvkk" className="underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      ) : null}

      {activeStep === "code" ? (
        <form onSubmit={onCodeSubmit} className="flex flex-col gap-3">
          <TextInput
            label={t("codeLabel")}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            error={error}
          />
          <p className="text-meta text-black/60">{t("spamHint")}</p>
          <Button type="submit" disabled={busy || code.trim().length !== 6}>
            {t("verify")}
          </Button>
          <button
            type="button"
            disabled={resendIn > 0 || busy}
            onClick={() => void sendCode()}
            className="cursor-pointer text-meta font-medium underline disabled:cursor-not-allowed disabled:text-black/60 disabled:no-underline"
          >
            {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
          </button>
        </form>
      ) : null}

      {activeStep === "onboarding" ? (
        <form
          onSubmit={(event) => void onOnboardingSubmit(event)}
          className="flex flex-col gap-3"
        >
          <p>{t("onboardingText")}</p>
          <TextInput
            label={t("firstName")}
            autoComplete="given-name"
            error={form.formState.errors.firstName ? t("required") : undefined}
            {...form.register("firstName")}
          />
          <TextInput
            label={t("lastName")}
            autoComplete="family-name"
            error={form.formState.errors.lastName ? t("required") : undefined}
            {...form.register("lastName")}
          />
          <Checkbox label={t("kvkkConsent")} {...form.register("consent")} />
          {form.formState.errors.consent ? (
            <p className="text-meta text-error">{t("consentRequired")}</p>
          ) : null}
          {error ? <p className="text-meta text-error">{error}</p> : null}
          <Button type="submit" disabled={busy}>
            {t("finish")}
          </Button>
        </form>
      ) : null}
    </Modal>
  );
}
