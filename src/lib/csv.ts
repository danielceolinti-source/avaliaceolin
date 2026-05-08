// Export utilities (CSV with Excel-friendly UTF-8 BOM and ; separator)
export function toCSV(rows: Record<string, any>[], columns?: { key: string; label: string }[]) {
  if (!rows.length) return "";
  const cols = columns ?? Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[";\n\r]/.test(s) ? `"${s}"` : s;
  };
  const head = cols.map((c) => esc(c.label)).join(";");
  const body = rows.map((r) => cols.map((c) => esc(r[c.key])).join(";")).join("\n");
  return `\uFEFF${head}\n${body}`;
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
