import { defineCommand } from 'citty'
import llmReferenceText from '../../generated/llm-reference.md' with { type: 'text' }
import { iconCounts } from '../icons-index.js'

export default defineCommand({
  meta: {
    name: 'llm',
    description: 'Emit the LLM-facing reference bundle (.gg grammar, CLI, doc{} keys, JSON schema).',
  },
  args: {
    format: {
      type: 'enum',
      options: ['markdown', 'json'],
      default: 'markdown',
      description: 'Output format',
    },
  },
  run({ args }) {
    if (args.format === 'json') {
      // Structured view for agent tooling. The full markdown is included verbatim
      // under `reference`, and the handful of fields agents most often need at a
      // glance are hoisted to the top level for cheap access.
      const versionMatch = llmReferenceText.match(/^Version:\s*(.+)$/m)
      const grammarMatch = llmReferenceText.match(
        /### Grammar \(informal BNF\)\n+```\n([\s\S]*?)```/,
      )
      const out = {
        version: versionMatch?.[1]?.trim() ?? 'unknown',
        iconCounts: iconCounts(),
        grammar: grammarMatch?.[1]?.trimEnd() ?? '',
        reference: llmReferenceText,
      }
      process.stdout.write(JSON.stringify(out, null, 2) + '\n')
      return
    }
    process.stdout.write(llmReferenceText)
    if (!llmReferenceText.endsWith('\n')) process.stdout.write('\n')
  },
})
