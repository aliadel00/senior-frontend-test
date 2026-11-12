#!/usr/bin/env node
/**
 * Lighthouse CI runner — build preview server + lhci autorun.
 * Copy from ~/.cursor/templates/performance/
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { cwd: root, stdio: 'inherit', ...opts })
}

function main() {
  const rc = join(root, 'lighthouserc.cjs')
  if (!existsSync(rc)) {
    console.error('Missing lighthouserc.cjs — copy from ~/.cursor/templates/performance/')
    process.exit(1)
  }

  const pkgPath = join(root, 'package.json')
  const scripts = existsSync(pkgPath)
    ? JSON.parse(readFileSync(pkgPath, 'utf8')).scripts ?? {}
    : {}

  if (scripts.build && !process.env.LHCI_SKIP_BUILD) {
    run('npm run build')
  }

  run('npx lhci autorun')
}

main()
