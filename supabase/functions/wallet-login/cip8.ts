import { Cbor, CborArray, CborBytes, CborMap, CborNegInt, CborTag, CborText, CborUInt, type CborObj } from "npm:@harmoniclabs/cbor@1";
import { blake2b_224, verifyEd25519Signature } from "npm:@harmoniclabs/crypto@0.2";
import { fromHex, toHex } from "npm:@harmoniclabs/uint8array-utils@1";

function intOf(obj: CborObj): number | null {
  if (obj instanceof CborUInt) return Number(obj.num);
  if (obj instanceof CborNegInt) return Number(obj.num);
  return null;
}

function mapGet(map: CborMap, key: number): CborObj | undefined {
  return map.map.find((e) => intOf(e.k) === key)?.v;
}

function textKeyGet(map: CborMap, key: string): CborObj | undefined {
  return map.map.find((e) => e.k instanceof CborText && e.k.text === key)?.v;
}

/** Extracts the 28-byte payment credential hash from a Cardano address (hex). */
export function paymentKeyHashFromAddress(addressHex: string): Uint8Array {
  const bytes = fromHex(addressHex);
  if (bytes.length < 29) throw new Error("Address too short");
  const type = bytes[0]! >> 4;
  // base (0-3), enterprise (6-7), reward (14-15) all carry a credential hash right after the header byte
  if (![0, 1, 2, 3, 6, 7, 14, 15].includes(type)) throw new Error("Unsupported address type");
  return bytes.slice(1, 29);
}

function unwrapTag(obj: CborObj): CborObj {
  return obj instanceof CborTag ? unwrapTag(obj.data) : obj;
}

/**
 * Verifies a CIP-30 `signData` result (CIP-8 COSE_Sign1 / COSE_Key) against the
 * claimed payment address and the exact payload that was signed.
 * Throws a descriptive error when anything does not match.
 */
export function verifyCip30SignData(input: {
  addressHex: string;
  payloadHex: string;
  signatureHex: string;
  keyHex: string;
}): void {
  const { addressHex, payloadHex, signatureHex, keyHex } = input;

  // --- COSE_Key: map { 1: 1 (OKP), -1: 6 (Ed25519), -2: pubkey bytes } ---
  const keyObj = unwrapTag(Cbor.parse(fromHex(keyHex)));
  if (!(keyObj instanceof CborMap)) throw new Error("Invalid COSE key");
  const kty = mapGet(keyObj, 1);
  const crv = mapGet(keyObj, -1);
  const pub = mapGet(keyObj, -2);
  if (intOf(kty!) !== 1 || intOf(crv!) !== 6 || !(pub instanceof CborBytes))
    throw new Error("Wallet key is not an Ed25519 key");
  const publicKey = pub.bytes;
  if (publicKey.length !== 32) throw new Error("Invalid public key length");

  // The key must actually control the claimed address.
  const expectedHash = paymentKeyHashFromAddress(addressHex);
  const actualHash = blake2b_224(publicKey);
  if (toHex(actualHash) !== toHex(expectedHash))
    throw new Error("The signing key does not match this wallet address");

  // --- COSE_Sign1: [ protected: bytes, unprotected: map, payload: bytes, signature: bytes ] ---
  const signObj = unwrapTag(Cbor.parse(fromHex(signatureHex)));
  if (!(signObj instanceof CborArray) || signObj.array.length !== 4)
    throw new Error("Invalid COSE_Sign1 structure");
  const [protectedHdr, , payloadObj, sigObj] = signObj.array;
  if (!(protectedHdr instanceof CborBytes) || !(payloadObj instanceof CborBytes) || !(sigObj instanceof CborBytes))
    throw new Error("Invalid COSE_Sign1 fields");

  // The wallet must have signed exactly the challenge payload we issued.
  if (toHex(payloadObj.bytes).toLowerCase() !== payloadHex.toLowerCase())
    throw new Error("The signed message does not match the verification challenge");

  // The protected header carries the address the wallet used.
  let headerOk = false;
  try {
    const protectedMap = unwrapTag(Cbor.parse(protectedHdr.bytes));
    if (protectedMap instanceof CborMap) {
      const addr = textKeyGet(protectedMap, "address");
      if (addr instanceof CborBytes)
        headerOk = toHex(paymentKeyHashFromAddress(toHex(addr.bytes))) === toHex(expectedHash);
    }
  } catch {
    headerOk = false;
  }
  if (!headerOk) throw new Error("The wallet signed with a different address");

  // Sig_structure = ["Signature1", protected, external_aad = "", payload]
  const sigStructure = Cbor.encode(
    new CborArray([
      new CborText("Signature1"),
      new CborBytes(protectedHdr.bytes),
      new CborBytes(new Uint8Array(0)),
      new CborBytes(payloadObj.bytes),
    ]),
  );

  if (!verifyEd25519Signature(sigObj.bytes, sigStructure.toBuffer(), publicKey))
    throw new Error("Signature verification failed");
}
