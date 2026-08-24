---
title: Examples
description: Changing what the overrides do.
order: 6
---

# Examples

Everything below is a change to
`GridCellStyler/customizers/CellRendererOverrides.tsx` or
`CellEditorOverrides.tsx`, rebuilt and reimported. There is no maker-facing
configuration: a customizer's behaviour is its code.

## Narrow an override to one column

The most common change. An override applies to every column of its data type on
the grid; the second argument is how it applies to one:

```tsx
Currency: (props, params) => {
    if (params.colDefs[params.columnIndex].name !== 'creditlimit') {
        // Every other currency column keeps the grid's own rendering.
        return undefined;
    }

    return <Label className="gcs-cell gcs-high">{props.formattedValue}</Label>;
},
```

## Style a cell from a sibling column

`rowData` carries the whole record, so a cell can be styled by something other
than its own value:

```tsx
Text: (props, params) => {
    const blocked = params.rowData?.donotemail === true;

    return blocked
        ? <Label className="gcs-cell gcs-low">{props.formattedValue}</Label>
        : undefined;
},
```

## Add an editor for a type that has none

Editors are keyed the same way. This adds a whole-number editor that commits on
Enter and cancels on Escape:

```tsx
Integer: (props, params) => (
    <TextField
        autoFocus
        type="number"
        defaultValue={String(props.value ?? '')}
        onChange={(_event, next) => props.onChange(Number(next))}
        onKeyDown={(event) => {
            if (event.key === 'Enter') params.stopEditing();
            if (event.key === 'Escape') params.stopEditing(true);
        }}
        onBlur={() => params.stopEditing()}
    />
),
```

:::callout{type=warning}
`props.onChange` stages a value; only `params.stopEditing()` commits it and
closes the editor. An editor that never calls it is one the user cannot leave.
:::

## Keep renderers pure

The grid calls these functions repeatedly, in an order it does not promise, and
may unmount what they return at any time. Anything that counts renders, caches
by mutation, or writes back to the record will eventually disagree with what is
on screen — including in ways that only appear once a grid is long enough to
scroll.
