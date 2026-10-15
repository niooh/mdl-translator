A tool that translates a strict Markdown-like format (`.mdl`) into a static HTML. One file, multiple outputs.<br>

## Features

- Strict hierarchical syntax: documents must start with `#1` and increment one level at a time; all content must live under a `##` subsection.
- Multiple output:
  - **Notes**: card-style output with 8 heading colors, escaped text, and inline/block math.
  - **Quiz**: each `##` subsection becomes a flashcard with tap navigation and a hierarchy viewer.
- **Code blocks**: standard fenced blocks, plus `script` (executed at build time in a Node `vm` sandbox) and `literal` (no rendering).
- **Math**: local KaTeX rendering for `\(...\)`, `$...$`, and `\[...\]`.
- **Rich text**: `[style]{...}` syntax for colors, underline, overline, sub/superscript, centering, and nested selectors like `b(s r c)`.
- **Title views**: print the heading tree, filter by level, or query by title text.

## Data source

The input for both modes is a single `.mdl` file.
See `examples/` for full samples and `todo.md` for the complete syntax spec.

## Install

You need Node.js ≥ 22.18.0 installed.

```bash
# git clone <this-repo> && cd mdl-translator/

pnpm install
pnpm build
```

## Usage

### Notes

```bash
node dist/cli.js examples/basic.mdl --out ./dist/test-output --serve
```

### Quiz

```bash
node dist/cli.js examples/basic.mdl --out-quiz ./dist/test-output --serve
```

### Title views

```bash
# print the whole heading tree
node dist/cli.js examples/basic.mdl --view-title

# restrict to certain levels
node dist/cli.js examples/basic.mdl --view-title 1,2

# exact subtree lookup
node dist/cli.js examples/basic.mdl --view-title "#2 Chapter 2"

# substring search
node dist/cli.js examples/basic.mdl --query-title "Chapter"
```

## CLI options

| Flag | Description |
|------|-------------|
| `--out`, `--out-note <dir>` | Output directory for the note HTML |
| `--out-quiz <dir>` | Output directory for the quiz HTML |
| `--serve` | Serve output at `http://localhost:8000` |
| `--view-title [levels\|#N title]` | Print the section tree (optionally filtered) |
| `--query-title <text>` | Print headings matching `text` |

Both output directories default to `os.tmpdir()` if none is given.

## Syntax at a glance

| Construct | Syntax | Notes |
|-----------|--------|-------|
| Section | `#N Title` | Must start at `#1`; no level skipping |
| Subsection | `## Title` | All content must live under a `##` |
| Code block | ` ```lang ` | Standard fenced block |
| Script block | ` ```script ` | Runs at build time, output embedded as text |
| Literal block | ` ```literal ` | Emitted verbatim, no rendering |
| Math inline | `\(...\)`, `$...$` | Rendered with local KaTeX |
| Math block | `\[...\]` | Rendered with local KaTeX |
| Rich text | `[r U]{text}` | Nested selectors like `b(s r c)` supported |
| List item | `- item` | Rendered as `<ul><li>…</li></ul>` |
| Line continuation | trailing `\` | Joins next line; `\\` is preserved |

## Output layout

```
output/
├── index.html
└── assets/
    ├── katex.min.css
    └── fonts/*.woff2
```

Generated HTML contains no external URL dependencies and runs offline.

## Development

```bash
pnpm dev      # run CLI directly from src
pnpm test     # vitest
pnpm check    # tsc --noEmit
pnpm build    # vite build -> dist/
```
