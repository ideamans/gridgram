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

// Extra notices appended verbatim after the auto-generated DEPS section.
// Used for libraries that are referenced but NOT bundled in the gg binary
// or the npm package — sharp + libvips are fetched at runtime into
// ~/.cache/gridgram on first PNG render (see src/cli/sharp-loader.ts).
const EXTRA_MD = `## libvips (LGPL-2.1-or-later) — dynamically fetched, not bundled
<https://github.com/libvips/libvips>

PNG output in the \`gg\` CLI uses **libvips** via \`sharp\`. Neither the
\`gg\` single-binary nor the \`gridgram\` npm package bundles libvips or
\`sharp\` itself; \`src/cli/sharp-loader.ts\` fetches the prebuilt
\`@img/sharp-libvips-<platform>\` package from the npm registry on first
PNG render and extracts it to \`~/.cache/gridgram/\`, where it is loaded
as a shared library.

Because the LGPL shared library lives in a user-owned cache directory,
users remain free to replace it with a modified or rebuilt libvips
without touching the \`gg\` binary, satisfying the LGPL's requirements
around relinking and user replacement.

Source code for libvips is available at
<https://github.com/libvips/libvips>. Prebuilt binaries and their build
manifests are published at
<https://www.npmjs.com/package/@img/sharp-libvips-dev>.

The full text of the GNU Lesser General Public License v2.1 is available
at <https://www.gnu.org/licenses/old-licenses/lgpl-2.1.txt>.
`

const EXTRA_PLAIN = `------------------------------------------------------------------------
libvips — LGPL-2.1-or-later (dynamically fetched, not bundled)
https://github.com/libvips/libvips
------------------------------------------------------------------------

PNG output in the \`gg\` CLI uses libvips via sharp. Neither the gg
single-binary nor the gridgram npm package bundles libvips or sharp
itself; src/cli/sharp-loader.ts fetches the prebuilt
@img/sharp-libvips-<platform> package from the npm registry on first
PNG render and extracts it to ~/.cache/gridgram/, where it is loaded
as a shared library.

Because the LGPL shared library lives in a user-owned cache directory,
users remain free to replace it with a modified or rebuilt libvips
without touching the gg binary, satisfying the LGPL's requirements
around relinking and user replacement.

Source code for libvips is available at
https://github.com/libvips/libvips. The full text of the GNU Lesser
General Public License v2.1 is available at
https://www.gnu.org/licenses/old-licenses/lgpl-2.1.txt.
`

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

  md.push(EXTRA_MD)
  plain.push(EXTRA_PLAIN)

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
