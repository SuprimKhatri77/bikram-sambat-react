# Contributing

Thanks for helping. This package is the React UI for
[bikram-sambat-ts](https://github.com/SuprimKhatri77/bikram-sambat-ts); its
job is interaction, accessibility and presentation. Calendar correctness
belongs to bikram-sambat-ts.

## Setup

You need [Bun](https://bun.sh) 1.3 or newer.

```sh
bun install
bun run dev # playground at http://localhost:5173, renders ./src directly
```

## Before opening a pull request

```sh
bun run typecheck
bun run lint
bun run format:check
bun run test
bun run build
bun run check:package
```

All of these must pass. CI runs the same checks.

For UI changes, also check by hand in the playground:

- keyboard-only use: Tab into the grid, every key in the README's table,
  opening and closing the date picker
- a screen reader if you can (labels, selected/today/disabled states, month
  announcements)
- light and dark themes, and `locale="ne"`
- the edges: BS 1979 Baisakh, BS 2100 Chaitra, `minDate`/`maxDate`, months
  with 29 and 32 days

## Guidelines

- **No calendar logic or data here.** Month lengths, weekdays, conversion,
  arithmetic, names and parsing come from bikram-sambat-ts. If something is
  missing, add it there (where it's checked against go-bs), not here.
- No runtime dependencies besides bikram-sambat-ts, and no network access.
- Library code must be safe to import on a server: browser globals only in
  effects, event handlers or behind `typeof` checks. The SSR tests enforce
  this.
- No hard-coded visible text in components; add it to `src/locale.ts` for
  both locales.
- Every exported component and type needs a JSDoc comment.
- Keep the public API small. New props need a real use case.
