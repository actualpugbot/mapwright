/**
 * Minimal big-endian NBT encoder + decoder, hand-rolled for total control over
 * the bit-packed Long_Array. gzip via fflate. Strings are UTF-8 (block ids and
 * properties are ASCII, so modified-UTF-8 edge cases don't arise).
 */
import { gzipSync, gunzipSync } from "fflate";

export const TAG = {
  End: 0,
  Byte: 1,
  Short: 2,
  Int: 3,
  Long: 4,
  Float: 5,
  Double: 6,
  ByteArray: 7,
  String: 8,
  List: 9,
  Compound: 10,
  IntArray: 11,
  LongArray: 12,
} as const;

export type TagId = (typeof TAG)[keyof typeof TAG];

export type NbtTag =
  | { type: "byte"; value: number }
  | { type: "short"; value: number }
  | { type: "int"; value: number }
  | { type: "long"; value: bigint }
  | { type: "string"; value: string }
  | { type: "byteArray"; value: Uint8Array | ArrayLike<number> }
  | { type: "intArray"; value: ArrayLike<number> }
  | { type: "longArray"; value: ArrayLike<bigint> }
  | { type: "list"; itemType: TagId; items: NbtTag[] }
  | { type: "compound"; value: Record<string, NbtTag> };

// Convenience constructors.
export const nInt = (value: number): NbtTag => ({ type: "int", value });
export const nShort = (value: number): NbtTag => ({ type: "short", value });
export const nByte = (value: number): NbtTag => ({ type: "byte", value });
export const nLong = (value: bigint): NbtTag => ({ type: "long", value });
export const nStr = (value: string): NbtTag => ({ type: "string", value });
export const nCompound = (value: Record<string, NbtTag>): NbtTag => ({
  type: "compound",
  value,
});
export const nList = (itemType: TagId, items: NbtTag[]): NbtTag => ({
  type: "list",
  itemType,
  items,
});
export const nByteArray = (value: Uint8Array | ArrayLike<number>): NbtTag => ({
  type: "byteArray",
  value,
});
export const nIntArray = (value: ArrayLike<number>): NbtTag => ({ type: "intArray", value });
export const nLongArray = (value: ArrayLike<bigint>): NbtTag => ({ type: "longArray", value });
export const nIntXYZ = (x: number, y: number, z: number): NbtTag =>
  nCompound({ x: nInt(x), y: nInt(y), z: nInt(z) });

// --- writer -----------------------------------------------------------------

class ByteWriter {
  private buf = new Uint8Array(1 << 16);
  private view = new DataView(this.buf.buffer);
  private pos = 0;

  private ensure(extra: number) {
    if (this.pos + extra <= this.buf.length) return;
    let len = this.buf.length;
    while (len < this.pos + extra) len *= 2;
    const next = new Uint8Array(len);
    next.set(this.buf.subarray(0, this.pos));
    this.buf = next;
    this.view = new DataView(this.buf.buffer);
  }

  u8(v: number) {
    this.ensure(1);
    this.view.setUint8(this.pos, v);
    this.pos += 1;
  }
  i16(v: number) {
    this.ensure(2);
    this.view.setInt16(this.pos, v, false);
    this.pos += 2;
  }
  u16(v: number) {
    this.ensure(2);
    this.view.setUint16(this.pos, v, false);
    this.pos += 2;
  }
  i32(v: number) {
    this.ensure(4);
    this.view.setInt32(this.pos, v, false);
    this.pos += 4;
  }
  i64(v: bigint) {
    this.ensure(8);
    this.view.setBigInt64(this.pos, v, false);
    this.pos += 8;
  }
  f32(v: number) {
    this.ensure(4);
    this.view.setFloat32(this.pos, v, false);
    this.pos += 4;
  }
  f64(v: number) {
    this.ensure(8);
    this.view.setFloat64(this.pos, v, false);
    this.pos += 8;
  }
  str(s: string) {
    const bytes = new TextEncoder().encode(s);
    this.u16(bytes.length);
    this.ensure(bytes.length);
    this.buf.set(bytes, this.pos);
    this.pos += bytes.length;
  }
  done(): Uint8Array {
    return this.buf.subarray(0, this.pos);
  }
}

function writePayload(w: ByteWriter, tag: NbtTag) {
  switch (tag.type) {
    case "byte":
      w.u8(tag.value & 0xff);
      break;
    case "short":
      w.i16(tag.value);
      break;
    case "int":
      w.i32(tag.value);
      break;
    case "long":
      w.i64(tag.value);
      break;
    case "string":
      w.str(tag.value);
      break;
    case "byteArray":
      w.i32(tag.value.length);
      for (let i = 0; i < tag.value.length; i++) w.u8(tag.value[i] & 0xff);
      break;
    case "intArray":
      w.i32(tag.value.length);
      for (let i = 0; i < tag.value.length; i++) w.i32(tag.value[i]);
      break;
    case "longArray":
      w.i32(tag.value.length);
      for (let i = 0; i < tag.value.length; i++) w.i64(tag.value[i]);
      break;
    case "list":
      w.u8(tag.items.length ? tag.itemType : TAG.End);
      w.i32(tag.items.length);
      for (const item of tag.items) writePayload(w, item);
      break;
    case "compound":
      for (const [name, child] of Object.entries(tag.value)) {
        w.u8(tagId(child));
        w.str(name);
        writePayload(w, child);
      }
      w.u8(TAG.End);
      break;
  }
}

function tagId(tag: NbtTag): TagId {
  switch (tag.type) {
    case "byte":
      return TAG.Byte;
    case "short":
      return TAG.Short;
    case "int":
      return TAG.Int;
    case "long":
      return TAG.Long;
    case "string":
      return TAG.String;
    case "byteArray":
      return TAG.ByteArray;
    case "intArray":
      return TAG.IntArray;
    case "longArray":
      return TAG.LongArray;
    case "list":
      return TAG.List;
    case "compound":
      return TAG.Compound;
  }
}

/** Serialize a root compound (anonymous, name "") and gzip it. */
export function encodeNbt(root: NbtTag, name = ""): Uint8Array {
  const w = new ByteWriter();
  w.u8(tagId(root));
  w.str(name);
  writePayload(w, root);
  return gzipSync(w.done());
}

// --- reader (for verification / tests) --------------------------------------

class ByteReader {
  private view: DataView;
  pos = 0;
  constructor(private buf: Uint8Array) {
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  u8() {
    return this.view.getUint8(this.pos++);
  }
  i16() {
    const v = this.view.getInt16(this.pos, false);
    this.pos += 2;
    return v;
  }
  i32() {
    const v = this.view.getInt32(this.pos, false);
    this.pos += 4;
    return v;
  }
  i64() {
    const v = this.view.getBigInt64(this.pos, false);
    this.pos += 8;
    return v;
  }
  f32() {
    const v = this.view.getFloat32(this.pos, false);
    this.pos += 4;
    return v;
  }
  f64() {
    const v = this.view.getFloat64(this.pos, false);
    this.pos += 8;
    return v;
  }
  str() {
    const len = this.view.getUint16(this.pos, false);
    this.pos += 2;
    const s = new TextDecoder().decode(this.buf.subarray(this.pos, this.pos + len));
    this.pos += len;
    return s;
  }
}

/** Decoded NBT as plain JS (compound→object, list→array, longArray→bigint[]). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DecodedNbt = any;

function readPayload(r: ByteReader, type: number): DecodedNbt {
  switch (type) {
    case TAG.Byte:
      return r.u8();
    case TAG.Short:
      return r.i16();
    case TAG.Int:
      return r.i32();
    case TAG.Long:
      return r.i64();
    case TAG.Float:
      return r.f32();
    case TAG.Double:
      return r.f64();
    case TAG.ByteArray: {
      const len = r.i32();
      const a = new Int8Array(len);
      for (let i = 0; i < len; i++) a[i] = r.u8();
      return a;
    }
    case TAG.String:
      return r.str();
    case TAG.List: {
      const itemType = r.u8();
      const len = r.i32();
      const items: DecodedNbt[] = [];
      for (let i = 0; i < len; i++) items.push(readPayload(r, itemType));
      return items;
    }
    case TAG.Compound: {
      const obj: Record<string, DecodedNbt> = {};
      for (;;) {
        const t = r.u8();
        if (t === TAG.End) break;
        const name = r.str();
        obj[name] = readPayload(r, t);
      }
      return obj;
    }
    case TAG.IntArray: {
      const len = r.i32();
      const a = new Int32Array(len);
      for (let i = 0; i < len; i++) a[i] = r.i32();
      return a;
    }
    case TAG.LongArray: {
      const len = r.i32();
      const a: bigint[] = new Array(len);
      for (let i = 0; i < len; i++) a[i] = r.i64();
      return a;
    }
    default:
      throw new Error(`Unknown NBT tag type ${type}`);
  }
}

/** gunzip + parse → { name, value }. */
export function decodeNbt(bytes: Uint8Array): { name: string; value: DecodedNbt } {
  const raw = bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes;
  const r = new ByteReader(raw);
  const type = r.u8();
  const name = r.str();
  return { name, value: readPayload(r, type) };
}
