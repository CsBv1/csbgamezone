import { secp256k1 } from "npm:@noble/curves@1.9.7/secp256k1";
import { sha256 } from "npm:@noble/hashes@1.8.0/sha2";
import { p2pkh, p2sh, p2wpkh } from "npm:@scure/btc-signer@1.8.1";

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function variableLength(length: number): Uint8Array {
  if (length < 0xfd) return Uint8Array.of(length);
  if (length <= 0xffff) {
    const bytes = Uint8Array.of(0xfd, 0, 0);
    new DataView(bytes.buffer).setUint16(1, length, true);
    return bytes;
  }
  const bytes = Uint8Array.of(0xfe, 0, 0, 0, 0);
  new DataView(bytes.buffer).setUint32(1, length, true);
  return bytes;
}

export function bitcoinMessageHash(message: string): Uint8Array {
  const prefix = new TextEncoder().encode("\x18Bitcoin Signed Message:\n");
  const bytes = new TextEncoder().encode(message);
  return sha256(sha256(concatBytes(prefix, variableLength(bytes.length), bytes)));
}

function decodeSignature(signature: string): Uint8Array | null {
  try {
    const bytes = Uint8Array.from(atob(signature), (character) => character.charCodeAt(0));
    return bytes.length === 65 ? bytes : null;
  } catch {
    return null;
  }
}

/** Verifies the ECDSA signed message format returned by Xverse for a payment address. */
export function verifyBitcoinMessage(address: string, message: string, signature: string): boolean {
  const bytes = decodeSignature(signature);
  if (!bytes) return false;
  const header = bytes[0]!;
  if (header < 27 || header > 42) return false;
  const recovery = (header - 27) & 3;
  const compressed = ((header - 27) & 4) !== 0;
  try {
    const point = secp256k1.Signature.fromCompact(bytes.subarray(1)).addRecoveryBit(recovery).recoverPublicKey(bitcoinMessageHash(message));
    const recovered = point.toRawBytes(compressed);
    const segwit = p2wpkh(recovered);
    const candidates = [p2pkh(recovered).address, segwit.address, p2sh(segwit).address];
    return candidates.some((candidate) => candidate === address ||
      (address.startsWith("bc1") && candidate?.toLowerCase() === address.toLowerCase()));
  } catch {
    return false;
  }
}
