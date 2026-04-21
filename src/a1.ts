/**
 * Excel-style A1 cell address helpers.
 *
 * Public cell coordinates in gridgram are **1-based** and can be
 * written as either:
 *   - A1 string:     "A1", "B3", "AA100" — case-insensitive
 *   - numeric tuple: [1, 1] (column 1, row 1)
 *   - numeric obj:   { col: 1, row: 1 }
 *
 * A1 = column 1, row 1 = top-left. Columns carry over the standard
 * Excel way: A..Z, AA..AZ, BA..BZ, …, ZZ, AAA…
 *
 * Internally gridgram normalizes every input to a 0-based `{ col, row }`
 * (see auto-position.ts) so layout math stays simple.
 */

const A1_RE = /^([A-Za-z]+)(\d+)$/

export interface OneBased {
  /** 1-based column (A=1). */
  col: number
  /** 1-based row (top=1). */
  row: number
}

/** True if `s` is syntactically a valid A1 address (letters + digits, row ≥ 1). */
export function isA1(s: string): boolean {
  const m = A1_RE.exec(s)
  if (!m) return false
  return +m[2] >= 1
}

/**
 * Parse a string as an A1 cell address to 1-based `{col, row}`. Throws
 * with a readable message on a malformed address.
 *
 * Accepts lower-case (`"aa100"`) but normalises to column math that
 * treats letters as case-insensitive.
 */
export function parseA1(s: string): OneBased {
  const m = A1_RE.exec(s)
  if (!m) {
    throw new Error(`Invalid cell address: "${s}" (expected letters + digits, e.g. "A1" or "AA100")`)
  }
  const letters = m[1].toUpperCase()
  const row = +m[2]
  if (row < 1) {
    throw new Error(`Invalid cell address: "${s}" (row must be ≥ 1)`)
  }
  // Convert letter run → column number (A=1, B=2, …, Z=26, AA=27, …).
  let col = 0
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64) // 'A' = 65 → 1
  }
  return { col, row }
}

/** Serialise 1-based `{col, row}` back to an A1 address ("A1", "AA100"). */
export function formatA1(col: number, row: number): string {
  if (col < 1 || !Number.isInteger(col)) throw new Error(`col must be a positive integer (got ${col})`)
  if (row < 1 || !Number.isInteger(row)) throw new Error(`row must be a positive integer (got ${row})`)
  let letters = ''
  let n = col
  while (n > 0) {
    const rem = ((n - 1) % 26)
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return `${letters}${row}`
}
