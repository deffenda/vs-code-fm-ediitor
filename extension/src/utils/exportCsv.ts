export interface CsvExportOptions {
  columns?: string[];
  includeHeader?: boolean;
  lineEnding?: '\n' | '\r\n';
}

export function escapeCsvValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  let normalized: string;

  if (typeof value === 'string') {
    normalized = value;
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    normalized = String(value);
  } else {
    try {
      normalized = JSON.stringify(value);
    } catch {
      normalized = String(value);
    }
  }

  const escaped = normalized.replace(/"/g, '""');
  if (/[",\n\r]/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
}

export function recordsToCsv(
  rows: Array<Record<string, unknown>>,
  options?: CsvExportOptions
): string {
  const lineEnding = options?.lineEnding ?? '\n';
  const includeHeader = options?.includeHeader ?? true;

  const columns =
    options?.columns ??
    Array.from(
      rows.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
      }, new Set<string>())
    );

  const lines: string[] = [];

  if (includeHeader) {
    lines.push(columns.map((column) => escapeCsvValue(column)).join(','));
  }

  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsvValue(row[column])).join(','));
  }

  return lines.join(lineEnding);
}
