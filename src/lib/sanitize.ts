// HTML entity escaping to prevent XSS when injecting dynamic values via innerHTML
// Use this for ALL user-supplied or API-sourced strings inserted into DOM markup

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
}

const ESCAPE_REGEX = /[&<>"'/]/g

export function escapeHtml(str: string): string {
  if (!str) return ''
  return String(str).replace(ESCAPE_REGEX, (char) => ESCAPE_MAP[char] || char)
}
