#!/usr/bin/env node
/**
 * Content & markup accessibility audit — static heuristics for web repos.
 * Copy from ~/.cursor/templates/a11y/
 *
 * Exit 0 = pass (warnings allowed), 1 = hard violations.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const SCAN_DIRS = ['src', 'app', 'pages', 'components', 'public']
const CODE_EXT = new Set(['.html', '.ts', '.tsx', '.jsx', '.vue', '.md', '.mdx'])
const IGNORE_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', 'data', 'i18n'])
const IGNORE_FILE_RE = /\.spec\.ts$|playwright\.config\.ts$/

const VAGUE_LINK_RE = />(\s*)(click here|read more|learn more|here|more)\s*</gi
const IMG_TAG_RE = /<img\b[^>]*>/gi
const ALT_ATTR_RE = /\balt\s*=\s*(['"])(.*?)\1/i
const BUTTON_RE = /<button\b[^>]*>([\s\S]*?)<\/button>/gi
const INPUT_RE = /<input\b[^>]*>/gi
const LABEL_FOR_RE = /\bfor\s*=\s*['"][^'"]+['"]/i
const H1_RE = /<h1\b/gi

/** @type {{ rule: string; severity: 'error' | 'warn'; message: string; file?: string; line?: number }[]} */
const findings = []

function add(rule, severity, message, file, line) {
  findings.push({ rule, severity, message, file, line })
}

function walk(dir, files = []) {
  if (!existsSync(dir)) return files
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) continue
    const path = join(dir, name)
    const st = statSync(path)
    if (st.isDirectory()) walk(path, files)
    else if (CODE_EXT.has(name.slice(name.lastIndexOf('.'))) && !IGNORE_FILE_RE.test(path)) {
      files.push(path)
    }
  }
  return files
}

function rel(path) {
  return relative(root, path)
}

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length
}

function scanFile(file, content) {
  const r = rel(file)

  for (const m of content.matchAll(VAGUE_LINK_RE)) {
    add('links', 'warn', `Vague link text "${m[0].replace(/[<>]/g, '').trim()}" — use descriptive text`, r, lineOf(content, m.index ?? 0))
  }

  for (const m of content.matchAll(IMG_TAG_RE)) {
    const tag = m[0]
    if (!ALT_ATTR_RE.test(tag)) {
      add('images', 'error', '<img> missing alt attribute', r, lineOf(content, m.index ?? 0))
    } else {
      const alt = tag.match(ALT_ATTR_RE)?.[2] ?? ''
      if (/\.(png|jpe?g|gif|webp|svg)/i.test(alt) && alt.length < 80) {
        add('images', 'warn', 'alt text looks like a filename — describe purpose', r, lineOf(content, m.index ?? 0))
      }
    }
  }

  for (const m of content.matchAll(BUTTON_RE)) {
    const inner = m[1].replace(/<[^>]+>/g, '').trim()
    if (!inner && !/aria-label\s*=/.test(m[0])) {
      add('controls', 'error', '<button> without visible text or aria-label', r, lineOf(content, m.index ?? 0))
    }
  }

  const inputs = [...content.matchAll(INPUT_RE)]
  if (inputs.length && !LABEL_FOR_RE.test(content) && !/aria-label\s*=/.test(content)) {
    add('forms', 'warn', 'Inputs present but no <label for="…"> or aria-label found in file', r)
  }

  const h1count = [...content.matchAll(H1_RE)].length
  if (h1count > 1) {
    add('structure', 'warn', `Multiple <h1> (${h1count}) — prefer one per page/view`, r)
  }
}

function scanJsxAssets(content, file) {
  const r = rel(file)
  const isIconFile = /[/\\]icons[/\\]/.test(file) || r.endsWith('Icon.tsx') || r === 'src/web/icons.ts'

  if (!isIconFile) {
    for (const m of content.matchAll(/<svg\b/gi)) {
      add('assets', 'error', 'Inline <svg> in component — move to src/**/icons/*.svg and use Icon', r, lineOf(content, m.index ?? 0))
    }
  }

  for (const m of content.matchAll(/placeholder=["']([^"'{][^"']{2,})["']/g)) {
    add('i18n', 'warn', `Hardcoded placeholder "${m[1]}" — use i18n message file`, r, lineOf(content, m.index ?? 0))
  }

  for (const m of content.matchAll(/aria-label=["']([^"'{][^"']{2,})["']/g)) {
    add('i18n', 'warn', `Hardcoded aria-label "${m[1]}" — use i18n message file`, r, lineOf(content, m.index ?? 0))
  }

  for (const m of content.matchAll(/<img\b[^>]*\/?>/gi)) {
    const tag = m[0]
    if (!/\balt\s*=/.test(tag)) {
      add('images', 'error', 'JSX <img> missing alt prop', r, lineOf(content, m.index ?? 0))
    }
  }
  for (const m of content.matchAll(/<a\b[^>]*>([^<]*)<\/a>/gi)) {
    const text = m[1].trim().toLowerCase()
    if (['click here', 'read more', 'learn more', 'here'].includes(text)) {
      add('links', 'warn', `Vague link text "${m[1].trim()}"`, r, lineOf(content, m.index ?? 0))
    }
  }
}

function main() {
  const files = SCAN_DIRS.flatMap((d) => walk(join(root, d)))
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    scanFile(file, content)
    if (file.endsWith('.tsx') || file.endsWith('.jsx')) scanJsxAssets(content, file)
  }

  const errors = findings.filter((f) => f.severity === 'error')
  const warns = findings.filter((f) => f.severity === 'warn')

  for (const f of findings) {
    const loc = f.file ? `${f.file}${f.line ? `:${f.line}` : ''}` : ''
    const prefix = f.severity === 'error' ? 'ERROR' : 'WARN'
    console.log(`${prefix} [${f.rule}] ${f.message}${loc ? ` (${loc})` : ''}`)
  }

  console.log(`\nContent a11y audit: ${errors.length} error(s), ${warns.length} warning(s)`)
  if (errors.length) process.exit(1)
}

main()
