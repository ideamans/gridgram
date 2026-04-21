/**
 * Top-level .gg parser (v2, command-first grammar):
 *
 *   1. tokenize()        — character-stream → Token[] (dsl.ts)
 *   2. parseStatements() — Token[] → per-statement results (dsl.ts)
 *   3. fold into DiagramDef — merge `doc` bodies (deep-merge, later wins)
 *      and accumulate icon / region / note / connector arrays.
 *   4. checkIntegrity()  — duplicate ids, valid refs, region connectedness.
 *
 * No more `%%{…}%%` directives — all scalars / theme / icons come from
 * `doc { … }` statements.
 */
import type { ConnectorDef, DiagramDef, NodeDef, NoteDef, RegionDef } from '../types.js'
import { tokenize, parseStatements } from './dsl.js'
import { checkIntegrity } from './integrity.js'
import type { GgError } from './errors.js'

export interface ParseResult {
  def: DiagramDef
  errors: GgError[]
  /**
   * Inline icon map collected from one or more `doc { icons: { … } }` bodies.
   * `undefined` when no icons directive appeared. Passed to the icon loader
   * as its `jsonIconsMap` argument — kept out of DiagramDef itself because
   * DiagramDef is the rendered-diagram contract and icon *sources* are a
   * build-time detail.
   */
  icons?: Record<string, string>
}

function deepMerge(target: Record<string, any>, source: Record<string, any>): void {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      deepMerge(target[k], v)
    } else {
      target[k] = v
    }
  }
}

const SCALAR_KEYS: ReadonlyArray<keyof DiagramDef | 'cols' | 'icons'> = [
  'cellSize', 'padding', 'columns', 'rows', 'cols', 'theme', 'icons',
] as const

function isScalarKey(k: string): boolean {
  return (SCALAR_KEYS as readonly string[]).includes(k)
}

export function parseGg(source: string): ParseResult {
  const errors: GgError[] = []
  const { tokens, errors: tokErrs } = tokenize(source)
  errors.push(...tokErrs)
  const { statements, errors: parseErrs } = parseStatements(tokens)
  errors.push(...parseErrs)

  const settings: Record<string, any> = {}
  let iconsMap: Record<string, string> | undefined

  const nodes: NodeDef[] = []
  const regions: RegionDef[] = []
  const connectors: ConnectorDef[] = []
  const notes: NoteDef[] = []
  const seenNodeIds = new Map<string, number>()  // id → line of first declaration

  for (const stmt of statements) {
    if (stmt.error) continue
    if (stmt.doc) {
      // Apply doc { ... } body: scalars / theme / icons → settings.
      // Arrays (nodes / connectors / regions / notes) are accepted too, for
      // bulk declaration without the DSL.
      for (const [k, v] of Object.entries(stmt.doc)) {
        if (k === 'nodes' || k === 'connectors' || k === 'regions' || k === 'notes') continue
        if (isScalarKey(k)) {
          const dstKey = k === 'cols' ? 'columns' : k
          if (k === 'icons' && v && typeof v === 'object') {
            iconsMap = { ...(iconsMap ?? {}), ...(v as Record<string, string>) }
          } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            settings[dstKey] = settings[dstKey] ?? {}
            deepMerge(settings[dstKey], v)
          } else {
            settings[dstKey] = v
          }
        }
      }
      if (Array.isArray(stmt.doc.nodes)) {
        for (const n of stmt.doc.nodes as NodeDef[]) {
          if (seenNodeIds.has(n.id)) {
            errors.push({
              message: `Duplicate node id "${n.id}"`,
              line: 0, source: 'json',
              related: { line: seenNodeIds.get(n.id)!, source: 'dsl' },
            })
            continue
          }
          seenNodeIds.set(n.id, 0)
          nodes.push(n)
        }
      }
      if (Array.isArray(stmt.doc.connectors)) connectors.push(...(stmt.doc.connectors as ConnectorDef[]))
      if (Array.isArray(stmt.doc.regions)) regions.push(...(stmt.doc.regions as RegionDef[]))
      if (Array.isArray(stmt.doc.notes)) notes.push(...(stmt.doc.notes as NoteDef[]))
      continue
    }
    if (stmt.node) {
      const n = stmt.node
      if (!n.id) {
        // Anonymous icon (no `:id`) — assign a document-wide auto-id so
        // every node still has a unique key for downstream bookkeeping.
        // Users don't see these unless they do `--format json`.
        let autoId = ''
        let i = seenNodeIds.size + 1
        do { autoId = `__n${i++}` } while (seenNodeIds.has(autoId))
        n.id = autoId
      }
      if (seenNodeIds.has(n.id)) {
        errors.push({
          message: `Duplicate node id "${n.id}"`,
          line: 0, source: 'dsl',
          related: { line: seenNodeIds.get(n.id)!, source: 'dsl' },
        })
        continue
      }
      seenNodeIds.set(n.id, 0)
      nodes.push(n)
    }
    if (stmt.region)    regions.push(stmt.region)
    if (stmt.connector) connectors.push(stmt.connector)
    if (stmt.note)      notes.push(stmt.note)
  }

  const def: DiagramDef = {
    ...settings,
    nodes,
    regions:    regions.length    > 0 ? regions    : undefined,
    connectors: connectors.length > 0 ? connectors : undefined,
    notes:      notes.length      > 0 ? notes      : undefined,
  } as DiagramDef

  if (def.nodes.length > 0 || (def.connectors?.length ?? 0) > 0 || (def.regions?.length ?? 0) > 0) {
    errors.push(...checkIntegrity(def))
  }

  return { def, errors, icons: iconsMap }
}
