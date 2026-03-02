// N-Number → ICAO24 hex converter
// US aircraft N-numbers map deterministically to ICAO24 addresses in the range A00001–AFFFFF
// Reference: github.com/guillaumemichel/icao-nnumber_converter
// Verified: N1→a00001, N12345→a061d9

const ICAO_BASE = 0xA00001;

// Block sizes at each digit level in the encoding tree:
// Level 0 (1st digit 1-9): each digit spans 101711 addresses
// Level 1 (2nd digit 0-9): 10111 addresses
// Level 2 (3rd digit 0-9): 951 addresses
// Level 3 (4th digit 0-9): 35 addresses
// Level 4 (5th digit 0-9): 1 address (leaf)
const BLOCK_SIZES = [101711, 10111, 951, 35, 1];

// Suffix charset: A-H, J-N, P-Z (24 letters — excludes I and O)
const SUFFIX_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const SUFFIX_COUNT = SUFFIX_CHARS.length; // 24

// At each level, how many slots each first-suffix-letter occupies:
// Levels 0-2: 25 (the letter itself + 24 possible second letters)
// Level 3: 1 (only single letter suffix fits, since 4 digits + 1 letter = 5 chars max)
const SUFFIX_SLOT = [25, 25, 25, 1];

function suffixIndex(ch) {
  const idx = SUFFIX_CHARS.indexOf(ch);
  return idx >= 0 ? idx : -1;
}

/**
 * Validate that a string is a plausible US N-number.
 * Accepts with or without leading "N". Examples: "N12345", "N1AB", "1AB".
 */
export function isValidNNumber(reg) {
  if (!reg || typeof reg !== "string") return false;
  const raw = reg.toUpperCase().replace(/^N/, "");
  if (raw.length < 1 || raw.length > 5) return false;
  if (!/^[1-9]/.test(raw)) return false;
  // All digits, or digits followed by 1-2 suffix letters (no I or O)
  return /^[1-9]\d{0,4}$/.test(raw) || /^[1-9]\d{0,3}[A-HJ-NP-Z]{1,2}$/.test(raw);
}

/**
 * Convert a US N-number to 6-char lowercase ICAO24 hex address.
 * Returns null if the registration is not a valid N-number.
 */
export function nNumberToIcao24(nNumber) {
  if (!nNumber || typeof nNumber !== "string") return null;
  const raw = nNumber.toUpperCase().replace(/^N/, "");
  if (!isValidNNumber("N" + raw)) return null;

  // First digit (1-9) is special — 9 buckets at the top level
  const d1 = parseInt(raw[0], 10);
  let offset = (d1 - 1) * BLOCK_SIZES[0];
  let level = 0;

  for (let pos = 1; pos < raw.length; pos++) {
    const ch = raw[pos];

    if (/[A-Z]/.test(ch)) {
      // Letter suffix — skip bare slot, then index into suffix area
      const s1 = suffixIndex(ch);
      if (s1 < 0) return null;
      offset += 1 + s1 * SUFFIX_SLOT[level];

      // Optional second letter
      if (pos + 1 < raw.length) {
        const s2 = suffixIndex(raw[pos + 1]);
        if (s2 < 0) return null;
        offset += 1 + s2;
      }
      break; // letters are always the last 1-2 characters
    }

    // Digit — skip bare slot + all letter suffix slots, then index into digit area
    const d = parseInt(ch, 10);
    const letterArea = SUFFIX_COUNT * SUFFIX_SLOT[level];
    offset += 1 + letterArea + d * BLOCK_SIZES[level + 1];
    level++;
  }

  return (ICAO_BASE + offset).toString(16).padStart(6, "0");
}
