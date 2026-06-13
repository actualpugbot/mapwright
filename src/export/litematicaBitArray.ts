/**
 * Litematica's `LitematicaBitArray` packing.
 *
 * Verified against litemapy: indices are packed into a long array using the
 * minimum bits per entry, CONTIGUOUSLY across long boundaries (an entry may
 * straddle two longs — the pre-1.16 Mojang style, NOT the 1.16+ no-straddle
 * format). Longs are signed 64-bit, written big-endian in the NBT Long_Array.
 */

const U64 = (1n << 64n) - 1n;

/** bits per entry = max(2, ceil(log2(paletteSize))). */
export function bitsPerEntry(paletteSize: number): number {
  if (paletteSize <= 0) return 2;
  return Math.max(2, Math.ceil(Math.log2(paletteSize)));
}

/** Convert an unsigned 64-bit BigInt to its signed two's-complement form. */
export function toSignedLong(u: bigint): bigint {
  const v = u & U64;
  return v >= 1n << 63n ? v - (1n << 64n) : v;
}

/** Pack palette indices into a signed long array. */
export function packBlockStates(indices: ArrayLike<number>, nbits: number): BigInt64Array {
  const volume = indices.length;
  const longCount = Math.max(1, Math.ceil((nbits * volume) / 64));
  const longs = new Array<bigint>(longCount).fill(0n);
  const mask = (1n << BigInt(nbits)) - 1n;

  for (let i = 0; i < volume; i++) {
    const value = BigInt(indices[i]) & mask;
    const startOffset = i * nbits;
    const startArrIndex = startOffset >> 6; // / 64
    const endArrIndex = ((i + 1) * nbits - 1) >> 6;
    const startBitOffset = BigInt(startOffset & 0x3f); // % 64

    longs[startArrIndex] = (longs[startArrIndex] | (value << startBitOffset)) & U64;

    if (endArrIndex !== startArrIndex) {
      const bitsWritten = 64n - startBitOffset;
      longs[endArrIndex] = (longs[endArrIndex] | (value >> bitsWritten)) & U64;
    }
  }

  const out = new BigInt64Array(longCount);
  for (let i = 0; i < longCount; i++) out[i] = toSignedLong(longs[i]);
  return out;
}

/** Decode a packed long array back to palette indices (for verification/tests). */
export function unpackBlockStates(
  longs: ArrayLike<bigint>,
  nbits: number,
  volume: number,
): Int32Array {
  const out = new Int32Array(volume);
  const mask = (1n << BigInt(nbits)) - 1n;
  const asU = (v: bigint) => v & U64;

  for (let i = 0; i < volume; i++) {
    const startOffset = i * nbits;
    const startArrIndex = startOffset >> 6;
    const endArrIndex = ((i + 1) * nbits - 1) >> 6;
    const startBitOffset = BigInt(startOffset & 0x3f);

    let value: bigint;
    if (startArrIndex === endArrIndex) {
      value = asU(longs[startArrIndex]) >> startBitOffset;
    } else {
      const bitsRead = 64n - startBitOffset;
      value = (asU(longs[startArrIndex]) >> startBitOffset) | (asU(longs[endArrIndex]) << bitsRead);
    }
    out[i] = Number(value & mask);
  }
  return out;
}
