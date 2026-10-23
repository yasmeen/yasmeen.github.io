// Packs the Blender export (miniyaz.json) into the small binary the site loads (assets/mini-yaz/model.bin).
//   node mini-yaz/tools/pack-model.mjs [in.json] [out.bin]
// Layout: "MYZ1", u32 meta length, meta JSON (padded to 4 bytes), then the sections the meta lists, the whole file gzipped.
// Positions and the body's triangle list are delta coded per channel and split into low/high byte planes, so gzip
// sees long runs of small numbers; that is about half the size of the base64 JSON, with no precision lost.
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = process.argv[2] || join(here, '..', 'miniyaz.json');
const dst = process.argv[3] || join(here, '..', '..', 'assets', 'mini-yaz', 'model.bin');
const data = JSON.parse(readFileSync(src, 'utf8'));

const b64 = (s, T) => { const b = Buffer.from(s, 'base64'); return new T(b.buffer, b.byteOffset, b.byteLength / T.BYTES_PER_ELEMENT); };
const zz = (d) => ((d << 1) ^ (d >> 31)) & 0xffff;

// stride 3 for positions (x, y, z planes), stride 1 for indices
const deltaPlanes = (u16, stride) => {
  const n = u16.length / stride, out = Buffer.alloc(u16.length * 2);
  let o = 0;
  for (let c = 0; c < stride; c++) {
    const lo = out.subarray(o, o + n), hi = out.subarray(o + n, o + 2 * n);
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const v = u16[i * stride + c], d = zz(((v - prev) << 16) >> 16);
      lo[i] = d & 0xff; hi[i] = d >> 8; prev = v;
    }
    o += 2 * n;
  }
  return out;
};

const meta = { sections: [] }, chunks = [];
let offset = 0;
const add = (path, kind, buf, count) => {
  meta.sections.push({ path, kind, count, offset, bytes: buf.length });
  chunks.push(buf);
  offset += buf.length;
};

for (const [key, part] of Object.entries(data)) {
  if (!part || typeof part !== 'object' || !('pos' in part)) { meta[key] = part; continue; }
  const keep = {};
  for (const [k, v] of Object.entries(part)) {
    if (k === 'pos') add(`${key}.pos`, 'pos', deltaPlanes(b64(v, Uint16Array), 3), part.n * 3);
    else if (k === 'idx') { const u = b64(v, Uint16Array); add(`${key}.idx`, 'idx', deltaPlanes(u, 1), u.length); }
    else if (['ao', 'aoR', 'blush', 'skin', 'wts'].includes(k)) { const u = b64(v, Uint8Array); add(`${key}.${k}`, 'u8', Buffer.from(u), u.length); }
    else keep[k] = v;
  }
  meta[key] = keep;
}

const json = Buffer.from(JSON.stringify(meta));
const pad = (4 - ((8 + json.length) % 4)) % 4;
const head = Buffer.alloc(8);
head.write('MYZ1', 0, 'ascii');
head.writeUInt32LE(json.length + pad, 4);
const file = Buffer.concat([head, json, Buffer.alloc(pad, 0x20), ...chunks]);
const gz = gzipSync(file, { level: 9 });
writeFileSync(dst, gz);
console.log(`${src} (${readFileSync(src).length} bytes) -> ${dst} (${gz.length} bytes, ${file.length} unpacked)`);
