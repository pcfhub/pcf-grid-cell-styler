# Grid Cell Styler

Fluent cell renderers and editors for the Power Apps grid, driven by column type.

## What the build disagreed with

Nothing, and the reason is worth recording: the customizer contract is not in
`@types/powerapps-component-framework`. It ships as `types.ts` inside
[the grid customizer template][template] — a file in a samples repository you
are told to clone, not a package — so it is vendored into `GridCellStyler/`
verbatim, with its provenance and the date it was taken in the header. Nothing
type-checks it against the platform; a re-take and a diff is the only way to
find drift.

## Platform behaviour worth knowing

- **`context.factory.fireEvent` is undeclared.** It is absent from
  `@types/powerapps-component-framework` (read from the type definitions —
  `interface Factory` has exactly `getPopupService` and `requestRender`), which
  is why `index.ts` reaches it through an `as any` cast, exactly as Microsoft's
  own template does. The platform has it; the types have never caught up.

- **The event name comes from the host, and an empty one means "do nothing".**
  The grid generates it and passes it through the bound property. Guarding on it
  is not defensive coding — it is what makes the control correctly inert on any
  surface that is not a customized grid.

- **Fluent 8 icons need `initializeIcons()`, which a cell renderer must not
  call.** Observed in a demo: the yes/no column rendered its word and no glyph,
  and the console said `The icon "skypecirclecheck" was used but not
  registered`. A customizer is mounted per cell inside a host that has made its
  own icon registration decisions, so registering over it would change icons the
  control does not own. The renderer uses text marks instead.

- **A renderer returning `undefined` is the documented "use your own".** Not an
  error path, and not rare: it is how a customizer keeps the grid's own
  virtualized rendering for the columns it has nothing to add to.

## Demo

`mocked`, and the tier follows from the surface rather than from the control.

A grid customizer can only be demonstrated inside a grid, and PCFHub's harness
is a stand-in for the Power Apps grid, not the grid itself: it renders
`demo/accounts.json` and calls this control's renderers and editors per cell.
The cells are real; the table around them is not. `full` would claim otherwise.

Confirmed by driving the compiled bundle through that harness against the real
platform React 16.14.0, ReactDOM and Fluent 8.121.1 globals: the Currency
override rendered `<label class="ms-Label gcs-cell gcs-number gcs-high">`, the
choice column rendered its pill, the yes/no column its mark, the date column
(which the control declines) rendered the grid's own plain text, and
double-clicking a text cell mounted the control's Fluent `TextField`.

## Not verified

- **Nothing has run inside a real Power Apps grid yet.** Everything above is the
  contract as documented plus behaviour observed in PCFHub's harness. Proving it
  needs an environment with the Power Apps grid control enabled on a table,
  `pac pcf push` or an imported solution, and the *Customizer control* property
  set to `pcfhu_PCFHub.GridCellStyler` — the steps in `docs/installation.md`.
  Specifically unproven: that the payload reaches the grid at all, that
  `colDefs`/`rowData` carry what the vendored types say, and that editors commit
  through `stopEditing` against a real record rather than a fixture row.

- **The Solution has not been packed.** `npm run build` compiles the bundle;
  only an msbuild pack produces the managed and unmanaged zips a release
  attaches, and it is the only local step that builds in production mode.

[template]: https://github.com/microsoft/PowerApps-Samples/tree/master/component-framework/resources/GridCustomizerControlTemplate
