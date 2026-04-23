/**
 * Runtime sharp loader.
 *
 * bun --compile cannot bundle sharp because it dynamically requires
 * platform-specific native modules. To keep a single-binary distribution,
 * we fetch sharp, its JS dependencies, the platform native addon, and
 * libvips into ~/.cache/gridgram on first PNG render and import from there.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { createRequire } from 'module'
import { spawnSync } from 'child_process'

const SHARP_VERSION = '0.33.5'
const REGISTRY = 'https://registry.npmjs.org'

type Os = 'linux' | 'darwin' | 'win32'
type Arch = 'x64' | 'arm64'

interface Platform {
  os: Os
  arch: Arch
  libc: 'glibc' | 'musl' | null
}

function detect(): Platform {
  const arch = process.arch as Arch
  const os = process.platform as Os
  let libc: 'glibc' | 'musl' | null = null
  if (os === 'linux') {
    libc = existsSync('/etc/alpine-release') ? 'musl' : 'glibc'
  }
  return { os, arch, libc }
}

function nativeSuffix(p: Platform): string {
  if (p.os === 'linux' && p.libc === 'musl') return `linuxmusl-${p.arch}`
  return `${p.os}-${p.arch}`
}

function cleanVersion(v: string): string {
  return v.replace(/^[^\d]*/, '').split(/[\s|]/)[0] ?? v
}

async function fetchJson(url: string): Promise<any> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`registry fetch failed (${r.status}): ${url}`)
  return r.json()
}

async function fetchTarballInto(url: string, destDir: string): Promise<void> {
  mkdirSync(destDir, { recursive: true })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`tarball fetch failed (${res.status}): ${url}`)
  const tgzPath = join(destDir, '.download.tgz')
  writeFileSync(tgzPath, Buffer.from(await res.arrayBuffer()))
  const r = spawnSync('tar', ['-xzf', tgzPath, '-C', destDir, '--strip-components=1'])
  if (r.status !== 0) {
    throw new Error(`tar extract failed: ${url}\n${r.stderr?.toString() ?? ''}`)
  }
  rmSync(tgzPath)
}

class Fetcher {
  private seen = new Set<string>()
  constructor(private nm: string) {}

  private destFor(name: string): string {
    return join(this.nm, ...name.split('/'))
  }

  async install(name: string, spec: string): Promise<void> {
    const version = cleanVersion(spec)
    const key = `${name}@${version}`
    if (this.seen.has(key)) return
    this.seen.add(key)

    const dest = this.destFor(name)
    if (!existsSync(join(dest, 'package.json'))) {
      const encoded = name.replace('/', '%2F')
      const meta = await fetchJson(`${REGISTRY}/${encoded}/${version}`)
      await fetchTarballInto(meta.dist.tarball, dest)
    }

    const pkg = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'))
    for (const [d, s] of Object.entries(pkg.dependencies ?? {})) {
      await this.install(d, s as string)
    }
  }
}

/**
 * Duplicate every top-level transitive dep into `<nm>/sharp/node_modules/`
 * so sharp's own `require('detect-libc')` / `require('color')` /
 * `require('semver')` (and their recursive deps) resolve via the standard
 * CJS algorithm WITHOUT having to walk up to the flat parent node_modules.
 *
 * Bun's compiled single-file binary (observed on 1.3.x) does not walk up
 * `node_modules/` from a runtime-loaded CJS file; it only consults the
 * directory immediately above the file and the file's own `node_modules/`.
 * Putting a full copy next to sharp sidesteps the whole walk-up problem.
 *
 * Overhead: ~200 KB of pure-JS duplicates; negligible.
 */
function seedNestedDeps(nm: string): void {
  const sharpNm = join(nm, 'sharp', 'node_modules')
  mkdirSync(sharpNm, { recursive: true })
  for (const name of readdirSyncSafe(nm)) {
    // Skip sharp itself and scoped dirs (which contain native platform packages).
    if (name === 'sharp' || name.startsWith('.') || name.startsWith('@')) continue
    const src = join(nm, name)
    const dst = join(sharpNm, name)
    if (existsSync(dst)) continue
    cpRecursiveSync(src, dst)
  }
}

function readdirSyncSafe(dir: string): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { readdirSync } = require('fs')
    return readdirSync(dir) as string[]
  } catch {
    return []
  }
}

function cpRecursiveSync(src: string, dst: string): void {
  // Node 16+ / Bun supports fs.cpSync recursive. Use it when available.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { cpSync, mkdirSync, readdirSync, statSync, copyFileSync } = require('fs')
  if (typeof cpSync === 'function') {
    cpSync(src, dst, { recursive: true })
    return
  }
  // Fallback recursive copy.
  mkdirSync(dst, { recursive: true })
  for (const entry of readdirSync(src)) {
    const s = join(src, entry)
    const d = join(dst, entry)
    if (statSync(s).isDirectory()) cpRecursiveSync(s, d)
    else copyFileSync(s, d)
  }
}

async function ensureCache(): Promise<string> {
  const plat = detect()
  const suffix = nativeSuffix(plat)
  const root = join(homedir(), '.cache', 'gridgram', `sharp-${SHARP_VERSION}`)
  const nm = join(root, 'node_modules')
  const sharpDir = join(nm, 'sharp')
  const marker = join(root, '.ready')
  if (existsSync(marker)) return sharpDir

  process.stderr.write(
    `[gridgram] Fetching sharp@${SHARP_VERSION} runtime for ${plat.os}-${plat.arch}${plat.libc ? '-' + plat.libc : ''}...\n`,
  )

  const fetcher = new Fetcher(nm)
  await fetcher.install('sharp', SHARP_VERSION)

  const sharpPkg = JSON.parse(readFileSync(join(sharpDir, 'package.json'), 'utf8'))
  const nativeName = `@img/sharp-${suffix}`
  const nativeSpec = sharpPkg.optionalDependencies?.[nativeName]
  if (!nativeSpec) throw new Error(`sharp ${SHARP_VERSION} does not support ${suffix}`)
  await fetcher.install(nativeName, nativeSpec as string)

  const nativePkg = JSON.parse(readFileSync(join(nm, '@img', `sharp-${suffix}`, 'package.json'), 'utf8'))
  const libvipsName = `@img/sharp-libvips-${suffix}`
  const libvipsSpec = nativePkg.dependencies?.[libvipsName] ?? nativePkg.optionalDependencies?.[libvipsName]
  if (libvipsSpec) {
    await fetcher.install(libvipsName, libvipsSpec as string)
  }

  // Mirror transitive pure-JS deps under sharp/node_modules/ so Bun's
  // compiled-binary resolver finds them without walking up.
  seedNestedDeps(nm)

  writeFileSync(marker, new Date().toISOString() + '\n')
  return sharpDir
}

export async function loadSharp(): Promise<any> {
  const sharpDir = await ensureCache()

  // IMPORTANT: this code path requires Bun 1.3.0 for the compiled binary.
  // Bun 1.3.1+ regressed the module resolver such that bare requires
  // issued from a runtime-loaded CJS file (`require('detect-libc')` inside
  // sharp/lib/sharp.js) cannot find deps even when installed both flat
  // and nested in the cache's node_modules. createRequire's bare-name
  // resolution, Module._resolveFilename hooks, and direct symlinks were
  // all verified as non-working on 1.3.13. The release workflow pins
  // Bun to 1.3.0 until the regression is fixed upstream.
  //
  // With Bun 1.3.0, anchoring createRequire at sharp's package.json is
  // enough: the standard CJS resolver walks up to the cache's flat
  // node_modules and finds every transitive dep.
  const anchor = join(sharpDir, 'package.json')
  const cacheRequire = createRequire(anchor)
  const mod = cacheRequire('./lib/index.js')
  return (mod as any).default ?? mod
}
