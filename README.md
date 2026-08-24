# Grid Cell Styler

Fluent cell renderers and editors for the Power Apps grid, driven by column type.

[![Build](https://github.com/pcfhub/pcf-grid-cell-styler/actions/workflows/build.yml/badge.svg)](https://github.com/pcfhub/pcf-grid-cell-styler/actions/workflows/build.yml)
[![Release](https://github.com/pcfhub/pcf-grid-cell-styler/actions/workflows/release.yml/badge.svg)](https://github.com/pcfhub/pcf-grid-cell-styler/actions/workflows/release.yml)

Documentation lives on [PCFHub](https://pcfhub.dev/components/pcf-grid-cell-styler), built
from the `docs/` directory in this repository. Edit the Markdown here; the hub
recompiles it.


## What it does

The Power Apps grid control renders every cell the same way: a value, in the
platform's own type-appropriate presentation. That is right almost always, and
occasionally useless — a credit limit that is an order of magnitude out of range
looks exactly like one that is fine, and a column of `Yes`/`No` reads as a wall
of identical text.

This is a **grid customizer**: a control that renders nothing itself and instead
hands the grid a table of cell renderers and editors, keyed by column data type.
Assign it to a table's Power Apps grid control and every text, currency,
yes/no and choice column on that grid draws through the code in
`GridCellStyler/customizers/` instead of the built-in renderer.

Two things about that shape are worth knowing before reading the code, because
both look like bugs otherwise. **The control has no visible output of its own** —
`updateView` returns an empty fragment, and a customizer dropped on a form does
nothing at all, correctly. And **most of its overrides decline most of the
time**: returning `undefined` from a renderer is the documented way to say "this
cell is fine as it is", and the grid then draws it itself. The Text override
returns an element only for empty values and long ones; the Currency override
only for numeric cells. Replacing every cell on every column would cost the grid
its own virtualized rendering for no visible difference.


## Properties

| Property | Type | Usage | Default | What it controls |
| --- | --- | --- | --- | --- |
| `EventName` | SingleLine.Text | bound, **required** | — | The event the grid listens on. Set by the platform, not by a maker. |

That is the entire surface, and it is not a setting: the Power Apps grid
generates an event name, passes it in through this property, and listens on it
for the payload this control fires during `init`. An empty value means nothing is
listening, and the control returns without firing — which is exactly what should
happen anywhere that is not a customized grid.

The control is configured by being *named* on a grid rather than by having
values set on it. See `docs/installation.md` for where that name goes.

Localisation: `en-US` (LCID 1033) only. React 16.14.0 and Fluent 8.121.1 are
declared as `<platform-library>` entries, so neither is bundled — the elements
the overrides return are rendered by the host's own React instance, which is the
only way their hooks can work. No `uses-feature` permissions are requested: the
control reaches no Web API, no device, and no navigation.


## On the hub

`mocked`, and the reason is the surface rather than the control.

A grid customizer can only be demonstrated inside a grid, and the hub's demo
harness is not the Power Apps grid — it is PCFHub's stand-in, rendering the
fixture in `demo/accounts.json` and calling this control's renderers and editors
for every cell (PCFHub's `demo.host: "grid"`). Everything you interact with in
the demo is this control's own code; the table around it is not the platform's.
`full` would claim the grid is real, which it is not.

The single preset covers each column type the control overrides — text (short,
long and empty), currency either side of the threshold, a choice column and a
yes/no column — plus a date column it deliberately declines, so the fallback to
the grid's own rendering is visible beside the customized cells.


## Install

Download the managed solution from the
[latest release](https://github.com/pcfhub/pcf-grid-cell-styler/releases/latest), or from
the component's page on the hub, and import it into your environment.

## Develop

```bash
npm install
npm start          # the PCF test harness
npm run build
npm run lint
npm run check      # what CI runs first: placeholders, pcfhub.json, control shape
```

Run `npm run refreshTypes` after every manifest edit — until you do,
`context.parameters` is typed from the old manifest and `tsc` will accept code that
cannot work.

To pack the solution locally you need msbuild — either Visual Studio or the
Visual Studio Build Tools:

```bash
cd Solution
msbuild /t:build /restore /p:configuration=Release
```

Both zips land in `Solution/bin/Release`. This is the only local step that compiles
in **production** mode, so a green `npm run build` is not evidence the shipping
bundle compiles — and the pack is incremental, so delete `obj/`, `out/`,
`Solution/obj/` and `Solution/bin/` first if you intend to quote a bundle size from
it.

## Release

1. Bump the version in **three** places, in one commit — they are checked
   against each other in CI:
   - `GridCellStyler/ControlManifest.Input.xml` → `<control version="…">`
   - `Solution/src/Other/Solution.xml` → `<Version>`
   - `package.json` → `"version"`
2. Tag it: `git tag v1.2.3 && git push --tags`

The release workflow builds, packs both solution types, and attaches them to a
GitHub Release. PCFHub picks the release up from its webhook within seconds, or
from the hourly sweep otherwise. A sync imports a draft; a person publishes it.

## Repository layout

| Path | What it is |
| --- | --- |
| `GridCellStyler/` | The control: manifest, entry point, CSS, localised strings |
| `Solution/` | The Dataverse solution that packages it |
| `SPEC.md` | What building this corrected, and what is verified versus read |
| `docs/` | The pages PCFHub publishes — see the comments in each file |
| `media/` | Images and video referenced from the docs |
| `pcfhub.json` | The hub's manifest: identity, links, docs path, demo |
| `scripts/` | Template setup and the CI guard that keeps it adopted |

## Licence

[MIT](LICENSE)
