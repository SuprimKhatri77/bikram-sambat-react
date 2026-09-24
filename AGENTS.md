# AGENTS.md

Guidance for AI coding agents working in this repository. `CONTRIBUTING.md`
is the human-facing version; keep the two consistent.

## What this is

`bikram-sambat-react` is the React UI layer (`NepaliCalendar`,
`NepaliDatePicker`) for the npm package `bikram-sambat-ts` (sibling
repository `../bs-ts`), which is itself the TypeScript port of the Go
package `go-bs` (`../go-bs`, the reference specification).

Dependency direction: this package → bikram-sambat-ts → its static data.
Never the reverse.

## Rules

- Never add BS calendar data or reimplement conversion, month lengths,
  weekdays, date arithmetic, month/weekday names or parsing. Use
  bikram-sambat-ts. If it lacks something, propose adding it there.
- `src/` must not touch `window`/`document` at module scope or during
  render; only in effects, handlers or behind `typeof` checks.
- No new runtime dependencies. React and React DOM are peer dependencies and
  must stay external in the build.
- Visible and accessible text lives in `src/locale.ts`, for both `en` and
  `ne`.
- Use Bun as the package manager (`bun install`); tests run on Vitest
  (`bun run test`).
- Before considering a change done, run: `bun run typecheck`,
  `bun run lint`, `bun run format:check`, `bun run test`, `bun run build`,
  `bun run check:package`.
- Never publish to npm and never push to a remote. Leave both to the
  maintainer.

## Layout

| Path               | Concern                                                                               |
| ------------------ | ------------------------------------------------------------------------------------- |
| `src/model.ts`     | pure UI helpers on bikram-sambat-ts: bounds, clamping, keyboard targets, tabbable day |
| `src/locale.ts`    | `en`/`ne` strings and digit conversion                                                |
| `src/hooks/`       | controllable state, SSR-safe today, isomorphic layout effect                          |
| `src/calendar/`    | `NepaliCalendar`, header, grid                                                        |
| `src/date-picker/` | `NepaliDatePicker`                                                                    |
| `src/styles.css`   | default styles, published as `dist/styles.css`                                        |
| `tests/`           | Vitest + Testing Library (jsdom), axe-core, SSR (node env)                            |
| `playground/`      | Vite app for manual testing (`bun run dev`)                                           |
