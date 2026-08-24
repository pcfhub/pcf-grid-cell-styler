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

- **One customizer per grid.** A platform constraint rather than this control's:
  if a table's grid already has a customizer assigned, this one replaces it.
  Merge the overrides into a single control instead.

- **Model-driven only.** The customizer interface belongs to the Power Apps grid
  control. On a form, or in a canvas app, this control renders nothing.

- **The hub's demo is not the Power Apps grid.** The cell renderers and editors
  running in it are this control's own; the grid around them is PCFHub's
  stand-in, which is why the demo is published as *simulated data* rather than
  fully interactive.
