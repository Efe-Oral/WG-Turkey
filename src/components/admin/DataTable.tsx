"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

export type TableColumn = { key: string; label: string; numeric?: boolean };
export type TableRow = Record<string, string | number | null>;

type DataTableProps = {
  title: string;
  fileName: string;
  columns: TableColumn[];
  rows: TableRow[];
};

function toCsvCell(value: string | number | null): string {
  const text = String(value ?? "");
  // A leading formula character would run as a formula when opened in Excel.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function downloadCsv(fileName: string, columns: TableColumn[], rows: TableRow[]) {
  const lines = [
    columns.map((column) => toCsvCell(column.label)).join(","),
    ...rows.map((row) =>
      columns.map((column) => toCsvCell(row[column.key] ?? null)).join(","),
    ),
  ];
  // The byte order mark makes Excel read Turkish characters correctly.
  const blob = new Blob([`﻿${lines.join("\n")}`], {
    type: "text/csv;charset=utf-8",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function DataTable({ title, fileName, columns, rows }: DataTableProps) {
  const t = useTranslations("admin");

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-meta font-semibold">{title}</h3>
        {rows.length > 0 ? (
          <Button
            compact
            variant="ghost"
            aria-label={`${t("csv")}: ${title}`}
            onClick={() => downloadCsv(fileName, columns, rows)}
            className="h-8 px-2 text-meta"
          >
            <Download aria-hidden="true" size={14} />
            {t("csv")}
          </Button>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-meta">
            <thead>
              <tr className="border-b border-black/12 text-left">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`px-2 py-1 font-semibold ${column.numeric ? "text-right" : ""}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-black/12">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-2 py-1 ${column.numeric ? "text-right tabular-nums" : ""}`}
                    >
                      {row[column.key] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-4 text-center text-black/60">{t("empty")}</p>
      )}
    </section>
  );
}
