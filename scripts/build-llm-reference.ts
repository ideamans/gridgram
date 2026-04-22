#!/usr/bin/env bun
/**
 * Generate src/generated/llm-reference.md from the SSOT sources:
 *
 *   - src/templates/llm-reference.template.md   (glue prose + placeholders)
 *   - src/gg/dsl.ts                             (BNF comment block)
 *   - src/cli/args.ts + src/cli/gg.ts           (CLI help via citty renderUsage)
 *   - src/generated/icon-index.json             (icon counts)
 *   - examples/<name>/diagram.gg                (canonical examples)
 *   - package.json                              (version)
 *
 * Re-run via `bun run build-llm-reference`. This script is wired into
 * `bun run sync-tabler` so the generated file is refreshed any time the icon
 * counts change; for code-side changes the Claude Code skill `regen-ai`
 * (planned) is the intended trigger.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf-8')
}

function extractBnf(dslSource: string): string {
  // The BNF lives in the first JSDoc comment of src/gg/dsl.ts.
  // We lift the body between `Grammar (informal BNF):` and the line that
  // closes the comment (`*/`).
  const start = dslSource.indexOf('Grammar (informal BNF):')
  if (start === -1) throw new Error('BNF marker not found in src/gg/dsl.ts')
  const close = dslSource.indexOf('*/', start)
  if (close === -1) throw new Error('unterminated BNF comment in src/gg/dsl.ts')
  const raw = dslSource.slice(start + 'Grammar (informal BNF):'.length, close)
  // Strip the leading ` * ` on each comment line.
  const lines = raw.split('\n').map((l) => l.replace(/^\s*\*\s?/, ''))
  // Drop leading/trailing empties.
  while (lines.length > 0 && lines[0]!.trim() === '') lines.shift()
  while (lines.length > 0 && lines[lines.length - 1]!.trim() === '') lines.pop()
  return lines.join('\n')
}

async function renderCliUsage(): Promise<{ usage: string; subcommands: string }> {
  // Import the compiled CLI's citty commands and render their help.
  const { renderUsage } = await import('citty')
  const flatRoot = (await import(join(root, 'src/cli/commands/render.ts'))).default
  const iconsCmd = (await import(join(root, 'src/cli/commands/icons.ts'))).default
  const llmCmd = (await import(join(root, 'src/cli/commands/llm.ts'))).default
  const licenseCmd = (await import(join(root, 'src/cli/commands/license.ts'))).default

  // Use the render command as the "primary" help since it has the whole
  // flag surface. citty injects ANSI escapes; we strip them for markdown.
  const ansiRE = /\[[0-9;]*m/g
  const usage = (await renderUsage(flatRoot)).replace(ansiRE, '')

  const renderMeta = (cmd: any): string => {
    const m = typeof cmd.meta === 'function' ? cmd.meta() : cmd.meta
    return `**\`gg ${m.name}\`** — ${m.description}`
  }
  const subcommands = [
    '- **`gg <file>`** — render a `.gg` to SVG/PNG/JSON (the default; same as `gg render`).',
    `- ${renderMeta(flatRoot)}`,
    `- ${renderMeta(iconsCmd)}`,
    `- ${renderMeta(llmCmd)}`,
    `- ${renderMeta(licenseCmd)}`,
  ].join('\n')
  return { usage, subcommands }
}

function readExample(dirName: string): string {
  const path = join(root, 'examples', dirName, 'diagram.gg')
  if (!existsSync(path)) {
    console.error(`Warning: example not found: ${path}`)
    return `# example ${dirName} missing from examples/\n`
  }
  return readFileSync(path, 'utf-8').trimEnd()
}

async function main(): Promise<void> {
  const template = read('src/templates/llm-reference.template.md')
  const dslSource = read('src/gg/dsl.ts')
  const pkg = JSON.parse(read('package.json'))
  const iconIndexPath = join(root, 'src/generated/icon-index.json')
  if (!existsSync(iconIndexPath)) {
    console.error('Missing src/generated/icon-index.json — run `bun run build-icon-index` first.')
    process.exit(1)
  }
  const iconIndex = JSON.parse(readFileSync(iconIndexPath, 'utf-8')) as Array<{ set: string }>

  const grammar = extractBnf(dslSource)
  const { usage: cliUsage, subcommands: cliSubcommands } = await renderCliUsage()
  const outlineCount = iconIndex.filter((r) => r.set === 'tabler-outline').length
  const filledCount = iconIndex.filter((r) => r.set === 'tabler-filled').length

  const replacements: Record<string, string> = {
    '{{VERSION}}': pkg.version,
    '{{GG_GRAMMAR}}': grammar,
    '{{CLI_USAGE}}': cliUsage.trimEnd(),
    '{{CLI_SUBCOMMANDS}}': cliSubcommands,
    '{{ICON_OUTLINE_COUNT}}': String(outlineCount),
    '{{ICON_FILLED_COUNT}}': String(filledCount),
    '{{ICON_TOTAL_COUNT}}': String(iconIndex.length),
    '{{EXAMPLE_MINIMAL}}': readExample('basic-01-hello'),
    '{{EXAMPLE_GRID}}': readExample('basic-03-grid-2x2'),
    '{{EXAMPLE_AUTO_WRAP}}': readExample('auto-wrap'),
    '{{EXAMPLE_ARROWS}}': readExample('conn-01-arrows'),
  }

  let rendered = template
  for (const [key, value] of Object.entries(replacements)) {
    rendered = rendered.split(key).join(value)
  }

  // Sanity: fail loudly if any placeholder slipped through.
  const missed = rendered.match(/\{\{[A-Z_]+\}\}/g)
  if (missed) throw new Error(`unresolved placeholders: ${[...new Set(missed)].join(', ')}`)

  const outPath = join(root, 'src/generated/llm-reference.md')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, rendered)
  console.log(`  wrote ${rendered.length} chars → ${outPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
