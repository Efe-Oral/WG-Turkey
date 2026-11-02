"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Turnstile } from "@/components/ui/Turnstile";
import {
  acknowledgeSafety,
  saveTemplate,
  sendFirstMessage,
  type SendError,
} from "@/lib/messaging/actions";
import { MAX_MESSAGE, MIN_FIRST_MESSAGE } from "@/lib/messaging/rules";
import { SafetyTips } from "./SafetyTips";

type ComposeFormProps = {
  publicNumber: number;
  safetyAcknowledged: boolean;
  templates: { id: string; name: string; body: string }[];
};

export function ComposeForm({
  publicNumber,
  safetyAcknowledged,
  templates,
}: ComposeFormProps) {
  const t = useTranslations("compose");
  const errors = useTranslations("messageErrors");
  const router = useRouter();

  const [body, setBody] = useState("");
  const [error, setError] = useState<SendError>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(safetyAcknowledged);
  const [showSafety, setShowSafety] = useState(false);
  const [token, setToken] = useState<string>();

  const onToken = useCallback((value: string) => setToken(value), []);

  const send = async () => {
    setBusy(true);
    setError(undefined);
    const result = await sendFirstMessage({
      publicNumber,
      body,
      turnstileToken: token,
    });
    setBusy(false);

    if (result.ok) router.push(`/mesajlar/${result.conversationId}`);
    else if (result.error === "safety") setShowSafety(true);
    else setError(result.error);
  };

  const onSubmit = () => {
    if (body.trim().length < MIN_FIRST_MESSAGE) {
      setError("too_short");
      return;
    }
    if (acknowledged) void send();
    else setShowSafety(true);
  };

  const onConfirmSafety = async () => {
    const { ok } = await acknowledgeSafety();
    setShowSafety(false);
    if (ok) {
      setAcknowledged(true);
      void send();
    } else {
      setError("failed");
    }
  };

  const onSaveTemplate = async () => {
    const name = body.trim().slice(0, 30);
    const { ok } = await saveTemplate({ name, body });
    setNotice(ok ? t("templateSaved") : t("templateFailed"));
  };

  return (
    <div className="flex flex-col gap-3">
      {templates.length > 0 ? (
        <label className="flex flex-col gap-1 text-meta font-semibold">
          {t("templatePicker")}
          <select
            defaultValue=""
            onChange={(event) => {
              const template = templates.find(
                (item) => item.id === event.target.value,
              );
              if (template) setBody(template.body);
            }}
            className="h-11 rounded-input border border-black/20 bg-white px-3 text-body font-normal"
          >
            <option value="">{t("templateChoose")}</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="flex flex-col gap-1 text-meta font-semibold">
        {t("label")}
        <textarea
          rows={12}
          maxLength={MAX_MESSAGE}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          aria-invalid={error ? true : undefined}
          className="rounded-input border border-black/20 bg-white p-3 text-body font-normal"
        />
      </label>

      {error ? (
        <p role="alert" className="text-meta text-error">
          {errors(error)}
        </p>
      ) : null}
      <p role="status" className="text-meta">
        {notice}
      </p>

      <Turnstile onToken={onToken} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          disabled={!body.trim()}
          onClick={() => void onSaveTemplate()}
        >
          {t("saveTemplate")}
        </Button>
        <Button disabled={busy} onClick={onSubmit}>
          {t("send")}
        </Button>
      </div>

      <SafetyTips
        open={showSafety}
        onConfirm={() => void onConfirmSafety()}
        onClose={() => setShowSafety(false)}
      />
    </div>
  );
}
