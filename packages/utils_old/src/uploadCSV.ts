export function uploadCSV(CSV_text: string, fileName: string): void {
  const blob = new Blob([CSV_text], { type: "text/csv" });

  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);

  a.href = url;
  a.download = `${fileName}.csv`;

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
