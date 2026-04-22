import { defineCommand } from 'citty'
import { renderArgs, toRenderArgs } from '../args.js'
import { runRender } from '../render.js'

export default defineCommand({
  meta: {
    name: 'render',
    description: 'Render a .gg file to SVG / PNG / JSON (the default action when a file is passed).',
  },
  args: {
    ...renderArgs,
    input: {
      type: 'positional',
      required: true,
      description: 'Path to a .gg file, or "-" to read from stdin',
    },
  },
  async run({ args, rawArgs }) {
    const code = await runRender(toRenderArgs(args, rawArgs))
    process.exit(code)
  },
})
