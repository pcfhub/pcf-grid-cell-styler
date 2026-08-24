---
title: Model-driven apps
description: Where a grid customizer applies, and where it does not.
order: 4
---

# Using it in a model-driven app

A grid customizer is not added to a form. It is assigned to a **table's grid**,
in the table's control settings — the steps are in
[Installation](installation.md), and everything below assumes they are done.

## Where the cells change

Once assigned, the control renders the cells of any grid for that table that
uses the **Power Apps grid control**:

- the table's main grid,
- views of that table inside an app,
- subgrids on a form, where the subgrid is set to the Power Apps grid control.

## Where they do not

- **Grids for other tables.** The assignment is per table; assign the same
  control on each one you want changed.
- **Grids using the legacy read-only or editable grid controls.** The customizer
  property exists only on the Power Apps grid control.
- **Forms.** A field on a form is not a grid cell, and this control renders
  nothing when placed on one — correctly, but confusingly if it was placed there
  expecting a field control.
- **Canvas apps and custom pages.** There is no grid customizer interface there.

## Column types

The control overrides text, currency, yes/no and choice columns; see the table
in the [Overview](overview.md) for what each does. Every other type — dates,
lookups, whole numbers, decimals, owners, files — is left to the grid, which
draws it exactly as it would with no customizer assigned.

:::callout{type=info}
A renderer that returns nothing is the platform's documented way to decline a
cell. This control declines far more cells than it takes: short text values, for
instance, are left alone, so the grid keeps its own rendering for the common
case.
:::

## Sorting and filtering

Unchanged, and deliberately so. Sorting and filtering run on the server against
the stored value, so a renderer must never display a *different* value than the
cell holds — otherwise a grid sorts correctly and appears not to. Everything
here restyles the value it was given; nothing rewrites it.
