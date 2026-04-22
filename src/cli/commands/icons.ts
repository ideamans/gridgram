import { defineCommand } from 'citty'
import { searchIcons, tagFrequency, iconCounts, type IconRecord } from '../icons-index.js'

export default defineCommand({
  meta: {
    name: 'icons',
    description: 'List and search built-in Tabler icons (outline + filled).',
  },
  args: {
    search: {
      type: 'string',
      description: 'Fuzzy match across name / label / tags / category',
      valueHint: 'query',
    },
    tag: {
      type: 'string',
      description: 'Filter to icons that include this exact tag',
    },
    tags: {
      type: 'boolean',
      description: 'List available tags with icon-count frequency',
    },
    set: {
      type: 'enum',
      options: ['tabler-outline', 'tabler-filled'],
      description: 'Restrict to a specific icon set',
    },
    format: {
      type: 'enum',
      options: ['text', 'json'],
      default: 'text',
      description: 'Output format',
    },
    limit: {
      type: 'string',
      description: 'Maximum results to print',
      valueHint: 'n',
    },
  },
  run({ args }) {
    const set = (args.set || undefined) as IconRecord['set'] | undefined
    const limit = args.limit ? Number(args.limit) : undefined
    if (args.limit && Number.isNaN(limit)) {
      process.stderr.write(`--limit expects a number (got "${args.limit}")\n`)
      process.exit(1)
    }
    const format = args.format === 'json' ? 'json' : 'text'

    if (args.tags) {
      const freq = tagFrequency(set)
      const trimmed = typeof limit === 'number' ? freq.slice(0, limit) : freq
      if (format === 'json') {
        process.stdout.write(JSON.stringify(trimmed, null, 2) + '\n')
      } else {
        for (const { tag, count } of trimmed) {
          process.stdout.write(`${tag}\t${count}\n`)
        }
      }
      return
    }

    const results = searchIcons(
      {
        search: args.search || undefined,
        tag: args.tag || undefined,
        set,
      },
      limit,
    )

    if (format === 'json') {
      const out = !args.search && !args.tag && !args.set && limit === undefined
        ? { counts: iconCounts(), results }
        : results
      process.stdout.write(JSON.stringify(out, null, 2) + '\n')
      return
    }

    for (const r of results) {
      // ref \t label \t category \t tags-joined   — grep-friendly
      process.stdout.write(`${r.ref}\t${r.label}\t${r.category}\t${r.tags.join(',')}\n`)
    }
  },
})
