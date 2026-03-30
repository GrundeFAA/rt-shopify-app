import { createHmac, timingSafeEqual } from "node:crypto";

const HEX_STRING_REGEX = /^[a-f0-9]+$/i;

export function createSha256HmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export function timingSafeHexEqual(left: string, right: string): boolean {
  if (!HEX_STRING_REGEX.test(left) || !HEX_STRING_REGEX.test(right)) {
    return false;
  }

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}
