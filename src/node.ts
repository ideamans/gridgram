/**
 * Node-only helpers — this entry point reads the filesystem (and
 * optionally fetches over HTTP) and is NOT safe to import from a
 * browser bundle. For the pure, browser-safe surface, import from
 * `'gridgram'` instead.
 *
 * Use these when you're building a CLI, a server, or a CI/build step
 * that needs to resolve icon file paths, walk up to a project config,
 * or decode dataURL-encoded icon sources.
 */

// Icon-loading helpers (fs + network) -----------------------------------
export {
  buildIconContext,
  decodeDataUrl,
  loadIconValue,
  loadIconDirectory,
  loadIconMap,
  loadPathRefs,
  resolvePathRef,
} from './gg/icon-loader.js'
export type { PathResolveCtx } from './gg/icon-loader.js'

// Project config discovery (walk-up from cwd) ---------------------------
export {
  findProjectConfig,
  loadConfigFile,
  loadProjectConfig,
} from './config-loader.js'
export type { ProjectConfigResult } from './config-loader.js'
