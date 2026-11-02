import { getTranslations } from "next-intl/server";
import { ModerationRow } from "@/components/admin/AdminRows";
import { getModerationQueue } from "@/lib/admin/queries";

export default async function ModerationPage() {
  const [t, queue] = await Promise.all([
    getTranslations("admin"),
    getModerationQueue(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-semibold">{t("modTitle")}</h1>
      {queue.length === 0 ? <p>{t("modEmpty")}</p> : null}
      <ul className="flex flex-col gap-3">
        {queue.map((item) => (
          <li key={item.id}>
            <ModerationRow item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
