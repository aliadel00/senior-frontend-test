#!/usr/bin/env node
/**
 * Fail-fast i18n parity check — en/ar catalogs must share the same keys.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function catalogKeys(relativePath) {
  const full = join(root, relativePath)
  if (!existsSync(full)) {
    throw new Error(`Missing ${relativePath}`)
  }
  const raw = readFileSync(full, 'utf8')
  const match = raw.match(/export const \w+[^=]*=\s*\{([\s\S]*?)\n\};?/)
  if (!match) {
    throw new Error(`Could not parse message object in ${relativePath}`)
  }
  return [...match[1].matchAll(/^\s{2}([A-Za-z0-9_]+)\s*:/gm)].map((m) => m[1])
}

const enKeys = catalogKeys('src/app/core/i18n/en.ts')
const arKeys = catalogKeys('src/app/core/i18n/ar.ts')
const enSet = new Set(enKeys)
const arSet = new Set(arKeys)

const missingInAr = enKeys.filter((k) => !arSet.has(k))
const missingInEn = arKeys.filter((k) => !enSet.has(k))
const dupEn = enKeys.filter((k, i) => enKeys.indexOf(k) !== i)
const dupAr = arKeys.filter((k, i) => arKeys.indexOf(k) !== i)

if (dupEn.length || dupAr.length || missingInAr.length || missingInEn.length) {
  if (dupEn.length) console.error('Duplicate keys in en:', [...new Set(dupEn)].join(', '))
  if (dupAr.length) console.error('Duplicate keys in ar:', [...new Set(dupAr)].join(', '))
  if (missingInAr.length) console.error('Keys missing in ar:', missingInAr.join(', '))
  if (missingInEn.length) console.error('Keys missing in en:', missingInEn.join(', '))
  process.exit(1)
}

if (!enKeys.length) {
  console.error('No i18n keys found')
  process.exit(1)
}

console.log(`i18n OK — ${enKeys.length} keys matched between en and ar`)
