---
layout: page
title: Gridgram
landing:
  hero:
    name: Gridgram
    text: A Mermaid-like text grammar for AI-era relationship diagrams.
    primary:
      text: Get started
      link: /en/guide/
    ai:
      text: Use with AI agents
      link: /en/ai/
    secondary:
      text: View on GitHub
      link: https://github.com/ideamans/gridgram

  features:
    items:
      - icon: robot
        title: Simple DSL
        body: A small grammar that humans and LLMs both write fluently.
      - icon: brand-typescript
        title: TypeScript library
        body: Drop it into web apps, build scripts, servers — anywhere JS runs.
      - icon: palette
        title: 5,500+ icons
        body: Tabler icons built in — search and use any of them instantly.
        link:
          href: https://tabler.io/icons
          text: tabler.io/icons
      - icon: photo
        title: SVG or PNG output
        body: Ship to the web, docs, slides, or print — one renderer, either format.

  demo:
    title: Place icons on a grid
    intro: The primary workflow — put nodes at explicit coordinates (@A1, @B1, …) and connect them. Same diagram, two authoring styles.
    name: landing-grid
    ggLabel: .gg (DSL)
    tsLabel: TypeScript

  aiReady:
    eyebrow: AI-native
    title: Built for LLM agents out of the box
    intro: Four first-class integration channels — pick whichever host you already use. Every path speaks the same `.gg` grammar, so your diagrams stay portable between agents.
    items:
      - icon: puzzle
        title: Claude Code plugin
        body: Marketplace plugin with /gg-install, /gg-icons, /gg-author, /gg-render slash commands.
        link: /en/ai/claude-plugin
        linkText: Tutorial →
      - icon: brand-github
        title: gh skill
        body: Install the same skill bundle into Copilot, Cursor, Gemini CLI, or Codex with one `gh` command.
        link: /en/ai/gh-skill
        linkText: Tutorial →
      - icon: plug-connected
        title: context7 (MCP)
        body: Zero-install doc retrieval — any MCP-capable agent can query gridgram's full reference.
        link: /en/ai/context7
        linkText: Tutorial →
      - icon: file-text
        title: llms.txt
        body: Public discovery files at the site root. curl-able index and ~230 KB full-bundle for context windows.
        link: /en/ai/llms-txt
        linkText: Reference →

  architecture:
    title: How it works
    intro: Two authoring paths converge on one rendering pipeline. The gg CLI reads .gg files; the gridgram npm package takes a DiagramDef directly. Both emit the same SVG. PNG is produced by the CLI only, via sharp / libvips fetched on first use.
    name: gridgram-flow

  acknowledgments:
    title: Built on open source
    intro: Gridgram stands on the shoulders of these projects. Licenses and notices are reproduced in THIRD_PARTY_LICENSES.md and gg --license.

  finalCta:
    title: Ready to try it?
    text: No signup, no API key — everything runs locally.
    primary:
      text: Read the guide
      link: /en/guide/
    ai:
      text: Use with AI agents
      link: /en/ai/
    secondary:
      text: GitHub
      link: https://github.com/ideamans/gridgram
---

<Landing />
