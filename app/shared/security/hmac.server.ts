import { createHmac, timingSafeEqual } from "node:crypto";

function toBufferFromHex(value: string): Buffer | null {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2 !== 0) {
    return null;
  }

  return Buffer.from(value, "hex");
}

export function createSha256HmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export function timingSafeHexEqual(left: string, right: string): boolean {
  const leftBuffer = toBufferFromHex(left);
  const rightBuffer = toBufferFromHex(right);

  if (!leftBuffer || !rightBuffer || leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
