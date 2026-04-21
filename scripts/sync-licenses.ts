/**
 * Aggregate LICENSE files from runtime dependencies into:
 *   - THIRD_PARTY_LICENSES.md (committed; ships in source distributions)
 *   - src/data/licenses.txt    (gitignored; embedded into the gg binary
 *                               via a JSON import for `gg --license`)
 *
 * Only runtime deps are listed (devDeps don't reach end users). License
 * file names vary per package (LICENSE / LICENSE.md / LICENSE.txt), so
 * we probe a small set of common names.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

interface DepEntry {
  name: string
  /** Path relative to node_modules root */
  path: string
  /** Pretty SPDX-ish identifier for the heading */
  spdx: string
  homepage?: string
}

// Hand-maintained — all gridgram runtime deps. SPDX strings come from
// each package's package.json, double-checked against its LICENSE file.
const DEPS: DepEntry[] = [
  { name: 'preact',                  path: 'preact',                  spdx: 'MIT',        homepage: 'https://preactjs.com' },
  { name: 'preact-render-to-string', path: 'preact-render-to-string', spdx: 'MIT',        homepage: 'https://github.com/preactjs/preact-render-to-string' },
  { name: '@tabler/icons',           path: '@tabler/icons',           spdx: 'MIT',        homepage: 'https://tabler.io/icons' },
  { name: 'json5',                   path: 'json5',                   spdx: 'MIT',        homepage: 'https://json5.org' },
  { name: 'sharp',                   path: 'sharp',                   spdx: 'Apache-2.0', homepage: 'https://sharp.pixelplumbing.com' },
]

const LICENSE_FILENAMES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md']

function readLicenseFile(pkgDir: string): string {
  for (const name of LICENSE_FILENAMES) {
    const p = join(pkgDir, name)
    if (existsSync(p)) return readFileSync(p, 'utf-8').trim()
  }
  throw new Error(`No LICENSE file found under ${pkgDir}`)
}

function build(): { md: string; plain: string } {
  const md: string[] = []
  const plain: string[] = []

  md.push('# Third-Party Licenses')
  md.push('')
  md.push('gridgram\'s `gg` binary bundles the following runtime dependencies.')
  md.push('Each is distributed under its own license; the full text is')
  md.push('reproduced below as required by the respective licenses.')
  md.push('')

  plain.push('gridgram — Third-Party Licenses')
  plain.push('=================================')
  plain.push('')
  plain.push('The `gg` binary bundles the following runtime dependencies.')
  plain.push('Each license\'s full text is reproduced below as required.')
  plain.push('')

  for (const dep of DEPS) {
    const pkgDir = join('node_modules', dep.path)
    const text = readLicenseFile(pkgDir)

    md.push(`## ${dep.name} (${dep.spdx})`)
    if (dep.homepage) md.push(`<${dep.homepage}>`)
    md.push('')
    md.push('```')
    md.push(text)
    md.push('```')
    md.push('')

    plain.push('-'.repeat(72))
    plain.push(`${dep.name} — ${dep.spdx}`)
    if (dep.homepage) plain.push(dep.homepage)
    plain.push('-'.repeat(72))
    plain.push('')
    plain.push(text)
    plain.push('')
  }

  return {
    md: md.join('\n'),
    plain: plain.join('\n'),
  }
}

const { md, plain } = build()
writeFileSync('THIRD_PARTY_LICENSES.md', md + '\n')
mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/licenses.txt', plain + '\n')

console.log(`  wrote THIRD_PARTY_LICENSES.md  (${md.length} chars)`)
console.log(`  wrote src/data/licenses.txt     (${plain.length} chars, embedded into gg binary)`)
