/**
 * Copies @tabler/icons' bundled JSON node dumps into src/data/ so they
 * can be imported directly (the package's `exports` field blocks module
 * resolution to those JSON files otherwise). Run once after `bun install`.
 */
import { mkdirSync, existsSync, copyFileSync } from 'fs'
import { join } from 'path'

const src = 'node_modules/@tabler/icons'
const dst = 'src/data'
mkdirSync(dst, { recursive: true })

const files: [string, string][] = [
  ['tabler-nodes-outline.json', 'tabler-outline.json'],
  ['tabler-nodes-filled.json', 'tabler-filled.json'],
]

for (const [from, to] of files) {
  const srcPath = join(src, from)
  const dstPath = join(dst, to)
  if (!existsSync(srcPath)) {
    console.error(`Missing ${srcPath} — did you install @tabler/icons?`)
    process.exit(1)
  }
  copyFileSync(srcPath, dstPath)
  console.log(`  ${srcPath}  →  ${dstPath}`)
}
