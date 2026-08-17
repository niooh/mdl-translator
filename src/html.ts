const ESCAPE_CHARS = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
} as const;

export function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"]/g,
    (char) => ESCAPE_CHARS[char as keyof typeof ESCAPE_CHARS],
  );
}
