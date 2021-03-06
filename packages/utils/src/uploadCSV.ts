export function uploadCSV(CSVText: string, fileName: string): void {
  const blob = new Blob([CSVText], { type: "text/csv" });

  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);

  a.href = url;
  a.download = `${fileName}.csv`;

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
