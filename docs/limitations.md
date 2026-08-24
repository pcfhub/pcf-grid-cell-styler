---
title: Limitations
description: What Grid Cell Styler does not do.
order: 7
---

# Limitations

Constraints that were accepted, not defects.

- **The currency threshold is fixed at 100,000.** It is not configurable: a
  customizer is assigned per table and sees every currency column on that
  table's grid, so a single configurable threshold could only ever be right for
  one of them. Fork the control, or narrow the override to one column by name —
  the renderer receives `colDefs[columnIndex].name` for exactly that, and
  [Examples](examples.md) shows how.

- **Currency cells restyle the value the grid formatted; they do not reformat
  it.** A cell shows whatever the platform's own formatting produced, in a
  different colour. Rendering a differently formatted value would risk showing
  something other than what the grid sorts and filters on.

- **Choice and currency columns fall back to the grid's own editor.** A cell
  editor is handed the value and the column type but no option-set metadata, so
  a customizer cannot build a faithful choice picker. The grid's editor already
  can, and does.

- **Choice pill colours collide.** The colour is a hash of the option's own
  label into six buckets, so that an option keeps the same colour between
  renders without the control needing a table of every choice on the table. Six
  buckets over more than six options means two different choices can share a
  colour. Treat the colour as an aid to scanning, not as an identifier — the
  label is always on the pill.

- **Cells with a validation error keep the grid's own rendering.** A renderer
  replaces the whole cell, and the grid's error border and message go with it.
  Rather than draw an invalid cell as though it were fine, this control declines
  those cells and the grid draws the error it already knows how to draw.

- **Unset yes/no cells keep the grid's own rendering** for the same reason: an
  unanswered two-options column is not a `No`, and drawing it as one would put a
  grid on screen that disagrees with what the server filters on.

- **Secured cells fall back to the grid's own editor.** Field-level security is
  the platform's to enforce; a customizer that handed the user a working editor
  for a column they cannot write would only move the refusal to the save.

- **One customizer per grid.** A platform constraint rather than this control's:
  if a table's grid already has a customizer assigned, this one replaces it.
  Merge the overrides into a single control instead.

- **Model-driven only.** The customizer interface belongs to the Power Apps grid
  control. On a form, or in a canvas app, this control renders nothing.

- **The hub's demo is not the Power Apps grid.** The cell renderers and editors
  running in it are this control's own; the grid around them is PCFHub's
  stand-in, which is why the demo is published as *simulated data* rather than
  fully interactive. What the stand-in does not exercise is listed on the demo
  itself — the rest of the customizer interface, `PAGridAPI`, server-side sort
  and page, and the cell states (validation error, secured, required) a fixture
  carries no metadata to derive.
