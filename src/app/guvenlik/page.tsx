import type { Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("safetyPage");
  return { title: t("metaTitle"), description: t("intro") };
}

export default async function SafetyPage() {
  const [t, messages] = await Promise.all([
    getTranslations("safetyPage"),
    getMessages(),
  ]);

  const { sections } = messages.safetyPage as {
    sections: { title: string; text: string }[];
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
      <h1 className="text-h1 font-semibold">{t("title")}</h1>
      <p>{t("intro")}</p>
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="mb-1 text-h2 font-semibold">{section.title}</h2>
          <p>{section.text}</p>
        </section>
      ))}
    </div>
  );
}
