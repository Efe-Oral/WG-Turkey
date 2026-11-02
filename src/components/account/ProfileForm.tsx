"use client";

import { Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { updateAvatar, updateProfile } from "@/lib/account/actions";
import type { ViewerProfile } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/client";

const AVATAR_SIZE = 512;
const FIELDS = [
  "engineering",
  "health",
  "education",
  "law",
  "business",
  "social",
  "art",
  "it",
  "service",
  "other",
] as const;

type FormValues = {
  first_name: string;
  last_name: string;
  display_name_mode: "first_initial" | "full" | "first";
  gender: string;
  birth_year: string;
  occupation_status: string;
  occupation_field: string;
};

async function resizeAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  canvas
    .getContext("2d")!
    .drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE,
    );
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed."))),
      "image/webp",
      0.8,
    );
  });
}

type ProfileFormProps = {
  userId: string;
  profile: ViewerProfile;
  phone: string | null;
};

const selectClasses =
  "h-11 w-full rounded-input border border-black/20 bg-white px-3 text-body";

export function ProfileForm({ userId, profile }: ProfileFormProps) {
  const t = useTranslations("profile");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>();

  const { register, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: {
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      display_name_mode: profile.display_name_mode,
      gender: profile.gender ?? "",
      birth_year: profile.birth_year ? String(profile.birth_year) : "",
      occupation_status: profile.occupation_status ?? "",
      occupation_field: profile.occupation_field ?? "",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- Only used to label the options.
  const firstName = watch("first_name");
  const lastName = watch("last_name");
  const initial = lastName.charAt(0);

  const onSubmit = handleSubmit(async (values) => {
    const { ok } = await updateProfile({
      first_name: values.first_name,
      last_name: values.last_name,
      display_name_mode: values.display_name_mode,
      gender: (values.gender || null) as "female" | "male" | "unspecified" | null,
      birth_year: values.birth_year ? Number(values.birth_year) : null,
      occupation_status: (values.occupation_status || null) as
        | "student"
        | "employed"
        | "other"
        | null,
      occupation_field: values.occupation_field || null,
    });
    setStatus(ok ? t("saved") : t("saveFailed"));
  });

  const onPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const blob = await resizeAvatar(file);
      const path = `${userId}/${crypto.randomUUID()}.webp`;
      const { error } = await createClient()
        .storage.from("avatars")
        .upload(path, blob, { contentType: "image/webp" });
      if (error) throw error;

      const { ok } = await updateAvatar(path);
      if (!ok) throw new Error("Rejected.");
      router.refresh();
    } catch {
      setStatus(t("photoFailed"));
    }
  };

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-6"
    >
      <h1 className="text-center text-h1 font-semibold">{t("title")}</h1>

      <div className="flex flex-col items-center gap-2">
        <Avatar
          name={`${firstName} ${lastName}`.trim() || t("title")}
          src={profile.avatar_url ?? undefined}
          alt={t("photo")}
          size={120}
        />
        <Button
          compact
          variant="secondary"
          onClick={() => input.current?.click()}
        >
          <Camera aria-hidden="true" size={16} />
          {t("photoEdit")}
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          aria-label={t("photo")}
          onChange={(event) => void onPhoto(event)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label={t("firstName")} required {...register("first_name")} />
        <TextInput label={t("lastName")} required {...register("last_name")} />

        <label className="flex flex-col gap-1 text-meta font-semibold">
          {t("displayName")}
          <select className={selectClasses} {...register("display_name_mode")}>
            <option value="first_initial">
              {firstName} {initial ? `${initial}.` : ""}
            </option>
            <option value="full">
              {firstName} {lastName}
            </option>
            <option value="first">{firstName}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-meta font-semibold">
          {t("gender")}
          <select className={selectClasses} {...register("gender")}>
            <option value="">{t("select")}</option>
            <option value="female">{t("genderFemale")}</option>
            <option value="male">{t("genderMale")}</option>
            <option value="unspecified">{t("genderUnspecified")}</option>
          </select>
        </label>

        <TextInput
          label={t("birthYear")}
          type="number"
          min={1920}
          max={2015}
          {...register("birth_year")}
        />

        <label className="flex flex-col gap-1 text-meta font-semibold">
          {t("status")}
          <select className={selectClasses} {...register("occupation_status")}>
            <option value="">{t("select")}</option>
            <option value="student">{t("statusStudent")}</option>
            <option value="employed">{t("statusEmployed")}</option>
            <option value="other">{t("statusOther")}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-meta font-semibold">
          {t("field")}
          <select className={selectClasses} {...register("occupation_field")}>
            <option value="">{t("select")}</option>
            {FIELDS.map((field) => (
              <option key={field} value={field}>
                {t(`fields.${field}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p role="status" className="min-h-5 text-center text-meta">
        {status}
      </p>

      <div className="flex justify-center">
        <Button type="submit">{t("save")}</Button>
      </div>
    </form>
  );
}
