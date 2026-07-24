import crypto from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(): string {
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}
