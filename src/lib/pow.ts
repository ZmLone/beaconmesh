export const POW_DIFFICULTY_PREFIX = "000";

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function buildChallengeString(
  title: string,
  lat: number,
  lng: number,
  timestamp: number
): string {
  return `${title.trim()}|${lat.toFixed(4)}|${lng.toFixed(4)}|${timestamp}`;
}

export async function mineProofOfWork(
  title: string,
  lat: number,
  lng: number,
  timestamp: number
): Promise<{ nonce: string; hash: string }> {
  const base = buildChallengeString(title, lat, lng, timestamp);
  let counter = 0;
  while (true) {
    const nonce = counter.toString(36);
    const hash = await sha256Hex(`${base}:${nonce}`);
    if (hash.startsWith(POW_DIFFICULTY_PREFIX)) {
      return { nonce, hash };
    }
    counter++;
    if (counter % 1500 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
}

export async function verifyProofOfWork(
  title: string,
  lat: number,
  lng: number,
  timestamp: number,
  nonce: string
): Promise<{ valid: boolean; hash: string }> {
  const now = Date.now();
  if (timestamp > now + 5 * 60 * 1000 || now - timestamp > 24 * 60 * 60 * 1000) {
    return { valid: false, hash: "" };
  }
  const base = buildChallengeString(title, lat, lng, timestamp);
  const hash = await sha256Hex(`${base}:${nonce}`);
  return {
    valid: hash.startsWith(POW_DIFFICULTY_PREFIX),
    hash
  };
}
