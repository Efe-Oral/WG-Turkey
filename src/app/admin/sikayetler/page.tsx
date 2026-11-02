import { getTranslations } from "next-intl/server";
import { ReportRow } from "@/components/admin/AdminRows";
import { getOpenReports } from "@/lib/admin/queries";

export default async function ReportsPage() {
  const [t, reports] = await Promise.all([
    getTranslations("admin"),
    getOpenReports(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-semibold">{t("reportsTitle")}</h1>
      {reports.length === 0 ? <p>{t("reportsEmpty")}</p> : null}
      <ul className="flex flex-col gap-3">
        {reports.map((report) => (
          <li key={report.id}>
            <ReportRow report={report} />
          </li>
        ))}
      </ul>
    </div>
  );
}
