// Ambient module declarations for non-JS assets loaded via Bun's
// `with { type: 'text' }` import attribute. Bun's builtin types cover
// `.txt`, but not `.md` at the time of writing.
declare module '*.md' {
  const content: string
  export default content
}
