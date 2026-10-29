/** One column of a CSV export: the header and how to read the cell from a row. */
export type CsvColumn<T> = [header: string, cell: (row: T) => string | number | boolean | null | undefined];

function quote(value: string | number | boolean | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Spreadsheets run cells that start with = + - @ as formulas, so those get a leading apostrophe.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const isoTime = (epochSeconds: number | null | undefined) => (epochSeconds ? new Date(epochSeconds * 1000).toISOString() : "");

/** Builds the CSV in the browser and saves it. The BOM makes Excel read names with accents correctly. */
export function downloadCsv<T>(name: string, rows: T[], columns: CsvColumn<T>[]): void {
  const lines = [columns.map(([header]) => quote(header)).join(","), ...rows.map((row) => columns.map(([, cell]) => quote(cell(row))).join(","))];
  const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const day = new Date().toISOString().slice(0, 10);
  const anchor = Object.assign(document.createElement("a"), { href: url, download: `proofbeforepay-${name}-${day}.csv` });
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
