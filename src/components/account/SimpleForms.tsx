"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { Toggle } from "@/components/ui/Toggle";
import {
  deleteAccount,
  updateAbout,
  updateEmailNotifications,
} from "@/lib/account/actions";
import { deleteTemplate } from "@/lib/messaging/actions";

export function AboutForm({ initial }: { initial: string }) {
  const t = useTranslations("aboutPage");
  const profile = useTranslations("profile");
  const [about, setAbout] = useState(initial);
  const [status, setStatus] = useState<string>();

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-meta font-semibold">
        {t("label")}
        <textarea
          rows={8}
          maxLength={2000}
          value={about}
          onChange={(event) => setAbout(event.target.value)}
          className="rounded-input border border-black/20 bg-white p-3 text-body font-normal"
        />
      </label>
      <p className="text-meta text-black/60">{t("help")}</p>
      <p role="status" className="min-h-5 text-meta">
        {status}
      </p>
      <div>
        <Button
          onClick={() => {
            void updateAbout(about).then(({ ok }) =>
              setStatus(ok ? profile("saved") : profile("saveFailed")),
            );
          }}
        >
          {t("save")}
        </Button>
      </div>
    </div>
  );
}

export function NotificationToggle({ enabled }: { enabled: boolean }) {
  const t = useTranslations("settingsPage");

  return (
    <Toggle
      label={t("emailNotifications")}
      defaultChecked={enabled}
      onCheckedChange={(checked) => void updateEmailNotifications(checked)}
    />
  );
}

export function DeleteAccountForm() {
  const t = useTranslations("deletePage");
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex max-w-md flex-col gap-3">
      <TextInput
        label={t("confirmLabel")}
        value={confirmation}
        autoComplete="off"
        onChange={(event) => setConfirmation(event.target.value)}
        error={failed ? t("failed") : undefined}
      />
      <div>
        <Button
          variant="dark"
          disabled={confirmation !== t("confirmWord")}
          onClick={() => {
            void deleteAccount(confirmation).then(({ ok }) => {
              if (ok) {
                router.push("/");
                router.refresh();
              } else {
                setFailed(true);
              }
            });
          }}
        >
          {t("button")}
        </Button>
      </div>
    </div>
  );
}

export function TemplateDeleteButton({ id }: { id: string }) {
  const t = useTranslations("templatesPage");
  const router = useRouter();

  return (
    <Button
      compact
      variant="secondary"
      onClick={() => {
        void deleteTemplate(id).then(() => router.refresh());
      }}
    >
      {t("delete")}
    </Button>
  );
}
