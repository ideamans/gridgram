/**
 * Walk-up discovery + loading of `gridgram.config.{ts,js,mjs,cjs,json,json5}`.
 *
 * Mirrors the Tailwind / PostCSS pattern: starting from `cwd`, walk
 * toward the filesystem root looking for a config file. The first match
 * wins. JSON variants are parsed as data; script variants are imported
 * and their default export is returned.
 *
 * Callers can also hand an explicit path (e.g. CLI `--config <path>`),
 * bypassing discovery.
 */
import { existsSync, readFileSync } from 'fs'
import { join, dirname, resolve as pathResolve, isAbsolute } from 'path'
import { pathToFileURL } from 'url'
import JSON5 from 'json5'
import type { DiagramSettings } from './config'

const CONFIG_FILENAMES = [
  'gridgram.config.ts',
  'gridgram.config.mjs',
  'gridgram.config.js',
  'gridgram.config.cjs',
  'gridgram.config.json5',
  'gridgram.config.json',
] as const

export interface ProjectConfigResult {
  /** The resolved settings (default export of the config file). */
  settings: DiagramSettings
  /** Absolute path of the config file actually loaded. */
  path: string
}

/**
 * Search `startDir` and each parent for a gridgram config file. Returns
 * the first match's absolute path or null.
 */
export function findProjectConfig(startDir: string): string | null {
  let dir = pathResolve(startDir)
  while (true) {
    for (const name of CONFIG_FILENAMES) {
      const p = join(dir, name)
      if (existsSync(p)) return p
    }
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/** Load a config file at an absolute path. Inferred format from extension. */
export async function loadConfigFile(path: string): Promise<DiagramSettings> {
  const abs = isAbsolute(path) ? path : pathResolve(path)
  if (!existsSync(abs)) {
    throw new Error(`Config file not found: ${abs}`)
  }
  const ext = abs.slice(abs.lastIndexOf('.')).toLowerCase()
  if (ext === '.json' || ext === '.json5') {
    const body = readFileSync(abs, 'utf-8')
    return JSON5.parse(body) as DiagramSettings
  }
  // TS / JS — Bun loads .ts natively via dynamic import.
  const mod = await import(pathToFileURL(abs).href)
  const settings = (mod as any).default ?? mod
  if (!settings || typeof settings !== 'object') {
    throw new Error(`Config file ${abs} must export a default object`)
  }
  return settings as DiagramSettings
}

/**
 * Convenience: find + load in one call. `explicitPath`, when given,
 * skips discovery. Returns null when no config is found (no error).
 */
export async function loadProjectConfig(
  opts: { cwd?: string; explicitPath?: string } = {}
): Promise<ProjectConfigResult | null> {
  const cwd = opts.cwd ?? process.cwd()
  const path = opts.explicitPath ?? findProjectConfig(cwd)
  if (!path) return null
  const settings = await loadConfigFile(path)
  return { settings, path }
}
