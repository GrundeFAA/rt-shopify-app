import { createHmac } from "node:crypto";

type JwtPayload = Record<string, unknown>;

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signHs256(content: string, secret: string): string {
  return createHmac("sha256", secret).update(content, "utf8").digest("base64url");
}

export function signJwtHs256(payload: JwtPayload, secret: string): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const content = `${encodedHeader}.${encodedPayload}`;
  const signature = signHs256(content, secret);

  return `${content}.${signature}`;
}

export function verifyJwtHs256(token: string, secret: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const content = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signHs256(content, secret);
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const parsedHeader = JSON.parse(decodeBase64Url(encodedHeader)) as {
      alg?: string;
      typ?: string;
    };

    if (parsedHeader.alg !== "HS256" || parsedHeader.typ !== "JWT") {
      return null;
    }

    return JSON.parse(decodeBase64Url(encodedPayload)) as JwtPayload;
  } catch {
    return null;
  }
}
