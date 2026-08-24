---
title: Overview
description: Cell renderers and editors for the Power Apps grid, applied by column type.
order: 1
---

# Grid Cell Styler

A **grid customizer**: it changes how the Power Apps grid control draws and
edits its cells, without replacing the grid.

Assign it to a table's grid and every text, currency, yes/no and choice column
on that grid renders through this control instead of the built-in renderer — a
credit limit above 100,000 in blue and below it in red, choices as coloured
pills, yes/no as a mark and a word, long text truncated with the full value in a
tooltip. Editing a cell opens a Fluent editor from the same control.

## What is different about this kind of control

It renders nothing of its own. A grid customizer's whole output is a table of
functions it hands the grid during startup, and the grid calls them per cell for
as long as it is on screen. Two consequences:

- **Dropping it on a form does nothing.** It is configured by being *named* on a
  grid, not by being placed. See [Installation](installation.md).
- **It is assigned per table, and one grid gets one customizer.** Every grid
  using the Power Apps grid control for that table draws through it.

## Which columns it changes

| Column type | Read | Edit |
| --- | --- | --- |
| Text | Empty values as an em dash; long values truncated with a tooltip | Fluent text field |
| Currency | Blue at or above 100,000, red below, with the threshold stated for screen readers | Falls back to the grid's own editor |
| Yes/No | A green ✓ or grey × beside the word | Fluent toggle, committing on change |
| Choice | A coloured pill, its hue derived from the value so it stays stable | Falls back to the grid's own editor |

Every other column type is left entirely to the grid — dates, lookups, numbers,
owners and the rest render exactly as they do without this control installed.
That is deliberate: a renderer that returns nothing is the documented way to
say "this column is fine", and it keeps the grid's own virtualized rendering
for the columns nobody asked to change.

## What it works with

Model-driven apps, on tables whose grid is set to the **Power Apps grid
control**. Not canvas apps: the customizer interface belongs to that grid, and
there is nothing for this control to attach to elsewhere.
