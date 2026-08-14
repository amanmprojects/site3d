#!/usr/bin/env node
// Re-encode the embedded textures of a Sketchfab-style GLB and repack it.
//
// Why: GLTFLoader turns each embedded texture (bufferView image) into a blob: URL
// and decodes it via createImageBitmap. Multi-MB 4K PNGs from Sketchfab exports
// routinely fail that decode in the browser ("THREE.GLTFLoader: Couldn't load
// texture blob:..."), especially when several GLBs load at once. Re-encoding the
// maps as JPEG (color) or downscaled PNG (normal/specular) shrinks them 5-15x and
// makes the failure disappear, while keeping the same geometry, materials,
// animations and GLB workflow.
//
// Usage: node scripts/optimize-glb.mjs <in.glb> [out.glb]
// Requires ImageMagick 7 (`magick`) on PATH.
//
// Textures are chosen by their bufferView name (as exported by Sketchfab):
//   *baseColor*            -> JPEG, max 4096px
//   *metallicRoughness*    -> JPEG (4:4:4 chroma so the R/G channels stay crisp), max 2048px
//   *normal*               -> PNG (lossless), max 2048px
//   *specular*             -> PNG (lossless, keeps alpha), max 2048px
//   *emissive*             -> JPEG, max 2048px
//   anything else          -> JPEG, max 2048px

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const MAGICK = process.env.MAGICK || 'magick'

const TEX_RULES = [
  { match: /baseColor/i, max: 4096, format: 'jpeg', quality: 88 },
  { match: /metallicRoughness/i, max: 2048, format: 'jpeg', quality: 90, sampling: '1x1' },
  { match: /normal/i, max: 2048, format: 'png' },
  { match: /specular/i, max: 2048, format: 'png' },
  { match: /emissive/i, max: 2048, format: 'jpeg', quality: 85 },
  { match: /.*/, max: 2048, format: 'jpeg', quality: 88 },
]

function pickRule(name) {
  return TEX_RULES.find((r) => r.match.test(name))
}

function encodeImage(srcPath, rule) {
  const ext = rule.format === 'png' ? 'png' : 'jpg'
  const outPath = join(process.cwd(), `.optimize-${Math.random().toString(36).slice(2)}.${ext}`)
  try {
    const args = [srcPath, '-resize', `${rule.max}x${rule.max}>`, '-strip']
    if (rule.format === 'jpeg') {
      args.push('-sampling-factor', rule.sampling || '2x2', '-quality', String(rule.quality ?? 85))
    }
    args.push(outPath)
    execFileSync(MAGICK, args, { stdio: 'pipe' })
    return readFileSync(outPath)
  } finally {
    rmSync(outPath, { force: true })
  }
}

function parseGlb(bytes) {
  if (bytes.toString('utf8', 0, 4) !== 'glTF') throw new Error('not a GLB (bad magic)')
  const jsonLen = bytes.readUInt32LE(12)
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLen))
  const bin = bytes.subarray(20 + jsonLen + 8)
  return { json, bin }
}

function buildGlb(json, bin) {
  const jsonStr = Buffer.from(JSON.stringify(json), 'utf8')
  const jsonPad = (4 - (jsonStr.length % 4)) % 4
  const binPad = (4 - (bin.length % 4)) % 4
  const total = 12 + 8 + jsonStr.length + jsonPad + 8 + bin.length + binPad
  const out = Buffer.alloc(total)
  out.write('glTF', 0, 'utf8')
  out.writeUInt32LE(2, 4)
  out.writeUInt32LE(total, 8)
  out.writeUInt32LE(jsonStr.length + jsonPad, 12)
  out.write('JSON', 16, 'utf8')
  jsonStr.copy(out, 20)
  out.fill(0x20, 20 + jsonStr.length, 20 + jsonStr.length + jsonPad)
  const binOffset = 20 + jsonStr.length + jsonPad
  out.writeUInt32LE(bin.length + binPad, binOffset)
  out.write('BIN\0', binOffset + 4, 'utf8')
  bin.copy(out, binOffset + 8)
  return out
}

function main() {
  const [inPath, outPath] = process.argv.slice(2)
  if (!inPath) {
    console.error('usage: node scripts/optimize-glb.mjs <in.glb> [out.glb]')
    process.exit(1)
  }
  const dest = outPath || inPath
  const { json, bin } = parseGlb(readFileSync(inPath))
  const images = json.images || []

  if (images.length === 0) {
    console.log(`no embedded textures in ${inPath}; nothing to do`)
    return
  }

  const imageBvIndexes = images.map((im) => im.bufferView)
  if (imageBvIndexes.some((i) => i === undefined)) {
    throw new Error('image with external URI is not supported; only bufferView images')
  }

  const bvs = json.bufferViews
  const keptBvs = bvs.filter((_, i) => !imageBvIndexes.includes(i))
  if (keptBvs.length + images.length !== bvs.length) {
    throw new Error('image bufferViews must be the trailing entries; manual repack needed')
  }
  const cut = Math.min(...imageBvIndexes.map((i) => bvs[i].byteOffset ?? 0))
  if (cut % 4 !== 0) throw new Error(`geometry end ${cut} is not 4-byte aligned`)
  if (keptBvs.some((bv) => (bv.byteOffset ?? 0) + bv.byteLength > cut)) {
    throw new Error('a non-image bufferView extends past the image section; manual repack needed')
  }

  const tmp = mkdtempSync(join(tmpdir(), 'glb-opt-'))
  const newBvs = []
  const newImages = []
  const encoded = []
  let offset = cut

  try {
    images.forEach((im, i) => {
      const oldBv = bvs[imageBvIndexes[i]]
      const name = oldBv.name || `image${i}`
      const srcPath = join(tmp, `in_${i}`)
      writeFileSync(srcPath, bin.subarray(oldBv.byteOffset ?? 0, (oldBv.byteOffset ?? 0) + oldBv.byteLength))
      const rule = pickRule(name)
      const data = encodeImage(srcPath, rule)
      const pad = (4 - (data.length % 4)) % 4
      const padded = pad ? Buffer.concat([data, Buffer.alloc(pad)]) : data
      newBvs.push({
        buffer: 0,
        byteOffset: offset,
        byteLength: padded.length,
        name: `${name}.${rule.format === 'png' ? 'png' : 'jpg'}`,
      })
      newImages.push({ bufferView: keptBvs.length + i, mimeType: rule.format === 'png' ? 'image/png' : 'image/jpeg' })
      encoded.push(padded)
      console.log(
        `${name}: ${(oldBv.byteLength / 1048576).toFixed(2)}MB -> ${(data.length / 1048576).toFixed(2)}MB (${rule.max}px ${rule.format}${rule.quality ? ` q${rule.quality}` : ''})`
      )
      offset += padded.length
    })
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }

  json.bufferViews = [...keptBvs, ...newBvs]
  json.images = newImages
  json.buffers[0].byteLength = offset

  const newBin = Buffer.alloc(offset)
  bin.copy(newBin, 0, 0, cut)
  let off = cut
  for (const data of encoded) {
    data.copy(newBin, off)
    off += data.length
  }

  writeFileSync(dest, buildGlb(json, newBin))
  console.log(`wrote ${dest} (${(readFileSync(dest).length / 1048576).toFixed(2)}MB)`)
}

main()
