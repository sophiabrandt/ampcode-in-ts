// Output formatting. Separates data from presentation.
// Callers produce structured data; this module handles display.

export interface Formattable {
  id: string;
  title: string;
}

// formatText renders a resource as aligned human-readable text.
export function formatText(r: Formattable): string {
  return `ID:    ${r.id}\nTitle: ${r.title}`;
}

// formatJSON renders a value as indented JSON.
export function formatJSON(v: unknown): string {
  return JSON.stringify(v, null, 2);
}
