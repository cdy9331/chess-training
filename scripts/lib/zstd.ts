import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { createZstdDecompress } from 'node:zlib';

/**
 * Lichess의 .zst는 "seekable zstd" 형식이라 압축 조각(frame) 사이사이에 건너뛰기 프레임
 * (magic 0x184D2A5?)이 들어 있다. Node 내장 zstd 해제기는 이 프레임을 만나면
 * ZSTD_error_prefix_unknown으로 멈추므로, 명세(RFC 8878 §3.1)대로 프레임 경계를 직접 읽어
 * 실제 압축 프레임만 해제기에 넘긴다. (건너뛰기 프레임이 없는 일반 .zst도 그대로 처리된다)
 */
const ZSTD_MAGIC = 0xfd2fb528;

export function* zstdFrames(buf: Buffer): Generator<Buffer> {
  let pos = 0;
  while (pos + 4 <= buf.length) {
    const magic = buf.readUInt32LE(pos);
    if ((magic & 0xfffffff0) === 0x184d2a50) {
      pos += 8 + buf.readUInt32LE(pos + 4); // 건너뛰기 프레임: magic + 크기 + 내용
      continue;
    }
    if (magic !== ZSTD_MAGIC) throw new Error(`알 수 없는 zstd 프레임 (위치 ${pos})`);
    const start = pos;
    const fhd = buf[pos + 4] ?? 0;
    const fcsFlag = fhd >> 6;
    const singleSegment = (fhd >> 5) & 1;
    const hasChecksum = (fhd >> 2) & 1;
    const didSize = [0, 1, 2, 4][fhd & 3] ?? 0;
    const fcsSize = [singleSegment ? 1 : 0, 2, 4, 8][fcsFlag] ?? 0;
    pos += 4 + 1 + (singleSegment ? 0 : 1) + didSize + fcsSize;
    for (;;) {
      const header = buf.readUIntLE(pos, 3);
      const last = header & 1;
      const type = (header >> 1) & 3;
      const size = header >> 3;
      pos += 3 + (type === 1 ? 1 : size); // RLE 블록은 내용이 1바이트
      if (last) break;
    }
    if (hasChecksum) pos += 4;
    yield buf.subarray(start, pos);
  }
}

/** .zst 텍스트 파일을 디스크에 풀지 않고 한 줄씩 읽는다. (압축 파일 자체는 메모리에 올린다) */
export function readZstdLines(path: string) {
  return createInterface({
    input: Readable.from(zstdFrames(readFileSync(path))).pipe(createZstdDecompress()),
    crlfDelay: Infinity,
  });
}
