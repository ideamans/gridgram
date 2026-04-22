#!/usr/bin/env bun
/**
 * Validate every SKILL.md under plugins/** against the Agent Skills open
 * standard (https://agentskills.io/specification).
 *
 * Standards-compliant fields only:
 *   name (1–64 chars, kebab-case, no leading/trailing or consecutive hyphens,
 *         must match parent directory name)
 *   description (1–1024 chars, non-empty)
 *   license (optional)
 *   compatibility (optional, ≤500 chars)
 *   metadata (optional, string→string map)
 *   allowed-tools (optional, experimental — space-separated string)
 *
 * Anything else is flagged as non-standard so skills stay portable across
 * Claude Code / Copilot / Cursor / Gemini CLI / Codex via `gh skill`.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, basename, dirname, relative } from 'path'

const STANDARD_FIELDS = new Set([
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools',
])

interface Frontmatter {
  [key: string]: string | Record<string, string> | undefined
}

interface Issue {
  file: string
  severity: 'error' | 'warn'
  message: string
}

function splitFrontmatter(src: string): { frontmatter: string; body: string } | null {
  if (!src.startsWith('---\n')) return null
  const end = src.indexOf('\n---', 4)
  if (end === -1) return null
  return { frontmatter: src.slice(4, end), body: src.slice(end + 4).replace(/^\n/, '') }
}

function parseFlatYaml(text: string): Frontmatter {
  // Minimal flat YAML: `key: value` plus a single-nested `metadata:` block with
  // two-space-indented `key: value` entries. Enough for SKILL.md frontmatter.
  const out: Frontmatter = {}
  let inMetadata = false
  const meta: Record<string, string> = {}
  for (const rawLine of text.split('\n')) {
    if (rawLine.trim() === '' || rawLine.trim().startsWith('#')) continue
    if (inMetadata && rawLine.startsWith('  ')) {
      const m = rawLine.trimStart().match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
      if (m) meta[m[1]!] = m[2]!.replace(/^['"]|['"]$/g, '')
      continue
    }
    inMetadata = false
    const m = rawLine.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
    if (!m) continue
    const key = m[1]!
    const value = m[2]!
    if (key === 'metadata' && value.trim() === '') {
      inMetadata = true
      continue
    }
    out[key] = value.replace(/^['"]|['"]$/g, '')
  }
  if (Object.keys(meta).length > 0) out.metadata = meta
  return out
}

function walkSkillDirs(root: string): string[] {
  // Return every directory under `root` that contains a SKILL.md.
  const found: string[] = []
  if (!existsSync(root)) return found
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      const s = statSync(full)
      if (s.isDirectory()) visit(full)
      else if (s.isFile() && basename(full) === 'SKILL.md') found.push(dir)
    }
  }
  visit(root)
  return found
}

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export interface ValidationResult {
  skillDirs: string[]
  issues: Issue[]
}

export function validatePluginSkills(rootDir: string): ValidationResult {
  const skillDirs = walkSkillDirs(rootDir)
  const issues: Issue[] = []

  for (const dir of skillDirs) {
    const path = join(dir, 'SKILL.md')
    const src = readFileSync(path, 'utf-8')
    const split = splitFrontmatter(src)
    if (!split) {
      issues.push({ file: path, severity: 'error', message: 'missing YAML frontmatter (must start with `---` and end with `---`)' })
      continue
    }
    const fm = parseFlatYaml(split.frontmatter)
    const name = fm.name as string | undefined
    const desc = fm.description as string | undefined

    // name
    if (!name) {
      issues.push({ file: path, severity: 'error', message: 'missing required field: name' })
    } else {
      if (name.length < 1 || name.length > 64) {
        issues.push({ file: path, severity: 'error', message: `name "${name}" must be 1–64 characters (got ${name.length})` })
      }
      if (!NAME_RE.test(name)) {
        issues.push({ file: path, severity: 'error', message: `name "${name}" must be kebab-case (lowercase a–z, 0–9, single hyphens, no leading/trailing or consecutive hyphens)` })
      }
      const parent = basename(dir)
      if (name !== parent) {
        issues.push({ file: path, severity: 'error', message: `name "${name}" must match the parent directory "${parent}"` })
      }
    }

    // description
    if (!desc) {
      issues.push({ file: path, severity: 'error', message: 'missing required field: description' })
    } else {
      if (desc.length < 1 || desc.length > 1024) {
        issues.push({ file: path, severity: 'error', message: `description must be 1–1024 characters (got ${desc.length})` })
      }
      if (/[<>]/.test(desc)) {
        issues.push({ file: path, severity: 'warn', message: 'description contains angle brackets — some skill hosts strip them' })
      }
    }

    // compatibility (≤500 chars)
    const compat = fm.compatibility as string | undefined
    if (compat && compat.length > 500) {
      issues.push({ file: path, severity: 'error', message: `compatibility must be ≤500 characters (got ${compat.length})` })
    }

    // Flag non-standard top-level fields (excluding `metadata`, which is the
    // escape hatch for vendor-specific config).
    for (const k of Object.keys(fm)) {
      if (!STANDARD_FIELDS.has(k)) {
        issues.push({
          file: path,
          severity: 'warn',
          message: `non-standard frontmatter key "${k}" — move under metadata.<vendor>.<key> for cross-host portability`,
        })
      }
    }
  }

  return { skillDirs, issues }
}

function formatIssue(issue: Issue, root: string): string {
  const rel = relative(root, issue.file)
  const tag = issue.severity === 'error' ? 'ERROR' : 'warn '
  return `  ${tag}  ${rel}  —  ${issue.message}`
}

function main(): void {
  const pluginsRoot = join(process.cwd(), 'plugins')
  const { skillDirs, issues } = validatePluginSkills(pluginsRoot)
  console.log(`Checked ${skillDirs.length} skill directories under plugins/`)
  const errors = issues.filter((i) => i.severity === 'error')
  const warnings = issues.filter((i) => i.severity === 'warn')
  for (const issue of issues) console.log(formatIssue(issue, process.cwd()))
  console.log(`  ${errors.length} error(s), ${warnings.length} warning(s)`)
  if (errors.length > 0) process.exit(1)
}

// Allow both CLI invocation and programmatic use (tests).
if (import.meta.main) main()
