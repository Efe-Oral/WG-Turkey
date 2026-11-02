import { getTranslations } from "next-intl/server";
import { TemplateDeleteButton } from "@/components/account/SimpleForms";
import { Card } from "@/components/ui/Card";
import { getTemplates } from "@/lib/messaging/queries";

export default async function TemplatesPage() {
  const [t, templates] = await Promise.all([
    getTranslations("templatesPage"),
    getTemplates(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-semibold">{t("title")}</h1>
      {templates.length === 0 ? <p>{t("empty")}</p> : null}
      <ul className="flex flex-col gap-3">
        {templates.map((template) => (
          <li key={template.id}>
            <Card className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">{template.name}</p>
                <p className="mt-1 whitespace-pre-line text-meta">{template.body}</p>
              </div>
              <TemplateDeleteButton id={template.id} />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
