---
title: FAQ
description: Questions that come up more than once.
order: 8
---

# FAQ

## I imported the solution and nothing changed. Why?

Almost always because the control has not been assigned. A grid customizer is
named on a table's grid rather than placed on a form — step 2 of
[Installation](installation.md). Until then it is installed and inert, and
nothing is logged to say so.

## Can I use it on a form, or in a canvas app?

No. The customizer interface belongs to the Power Apps grid control, and this
control renders nothing anywhere else. See [Limitations](limitations.md).

## Can two customizers be assigned to the same grid?

No — one grid, one customizer. If you need overrides from two controls, merge
them into a single control's `cellRendererOverrides` and `cellEditorOverrides`.

## Why do only some cells look different?

By design. Returning nothing from a renderer is the documented way to say "use
the grid's own", and this control declines the columns and values it has nothing
to add to — short text, dates, lookups, whole numbers. The
[Overview](overview.md) lists exactly which columns it takes.

## Can I change the 100,000 currency threshold?

Only in code, and that is a deliberate constraint — see
[Limitations](limitations.md), and [Examples](examples.md) for narrowing an
override to one column while you are in there.

## How do I report a bug?

Open an issue at <https://github.com/pcfhub/pcf-grid-cell-styler/issues>, with
the platform version and the control version from the solution.
