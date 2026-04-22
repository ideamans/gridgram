#!/usr/bin/env bun
/**
 * gg — gridgram CLI entry.
 *
 * Built on citty. Two dispatch modes based on argv[0]:
 *   • a known subcommand name (render / icons / llm / license) → citty routes
 *     to that subcommand.
 *   • anything else (`gg file.gg`, `gg -` stdin, `gg --license`, `gg --help`)
 *     → we run the flat root command which accepts render args plus a
 *     --license shortcut, so the existing 0.x CLI surface stays identical.
 *
 * This split is needed because citty errors ("Unknown command") when a
 * subCommands-having command is invoked with a positional that isn't a
 * subcommand name. We want to keep `gg file.gg` working as it always has.
 */
import { defineCommand, runMain, showUsage } from 'citty'
import { renderArgs, toRenderArgs } from './args.js'
import { runRender } from './render.js'
import licensesText from '../data/licenses.txt' with { type: 'text' }
import renderCmd from './commands/render.js'
import iconsCmd from './commands/icons.js'
import llmCmd from './commands/llm.js'
import licenseCmd from './commands/license.js'

const SUBCOMMAND_NAMES = new Set(['render', 'icons', 'llm', 'license'])

const VERSION = '0.3.0'
const DESCRIPTION =
  'gridgram — grid-based diagram renderer. Subcommands: render (default) | icons | llm | license.'

const subcommandDispatcher = defineCommand({
  meta: { name: 'gg', version: VERSION, description: DESCRIPTION },
  subCommands: {
    render: renderCmd,
    icons: iconsCmd,
    llm: llmCmd,
    license: licenseCmd,
  },
})

const flatRoot = defineCommand({
  meta: { name: 'gg', version: VERSION, description: DESCRIPTION },
  args: {
    ...renderArgs,
    license: {
      type: 'boolean',
      description: 'Print bundled third-party licenses (alias for `gg license`)',
    },
  },
  async run({ args, rawArgs }) {
    if (args.license) {
      process.stdout.write(licensesText)
      if (!licensesText.endsWith('\n')) process.stdout.write('\n')
      process.exit(0)
    }
    if (!args.input) {
      await showUsage(flatRoot)
      process.exit(1)
    }
    const code = await runRender(toRenderArgs(args, rawArgs))
    process.exit(code)
  },
})

const argv = process.argv.slice(2)
const firstNonFlag = argv.find((a) => !a.startsWith('-'))
if (firstNonFlag && SUBCOMMAND_NAMES.has(firstNonFlag)) {
  runMain(subcommandDispatcher)
} else {
  runMain(flatRoot)
}
