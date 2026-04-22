import { defineCommand } from 'citty'
import licensesText from '../../data/licenses.txt' with { type: 'text' }

export default defineCommand({
  meta: {
    name: 'license',
    description: 'Print bundled third-party license texts.',
  },
  run() {
    process.stdout.write(licensesText)
    if (!licensesText.endsWith('\n')) process.stdout.write('\n')
  },
})
