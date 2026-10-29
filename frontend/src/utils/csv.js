// CSV export for admin tables. Built in the browser from the rows already on screen.

/**
 * Cells starting with = + - @ (or a tab / CR) are executed as formulas by Excel and Sheets, so they are
 * prefixed with an apostrophe. Values are always quoted.
 */
function cell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** columns: [{ header, value: (row) => any }] */
export function toCsv(columns, rows) {
  const lines = [columns.map((c) => cell(c.header)).join(',')];
  rows.forEach((row) => lines.push(columns.map((c) => cell(c.value(row))).join(',')));
  return lines.join('\r\n');
}

/** Downloads the rows as a UTF-8 CSV that opens correctly in Excel (BOM included). */
export function downloadCsv(filename, columns, rows) {
  const blob = new Blob([`\uFEFF${toCsv(columns, rows)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export const csvDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
