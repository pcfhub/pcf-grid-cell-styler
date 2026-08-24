---
title: API reference
description: Properties and outputs, generated from the control manifest.
order: 5
---

# API reference


## Input properties

::props-table{kind=input}

## Bound properties

::props-table{kind=bound}

## Outputs

::props-table{kind=output}

## Notes

`EventName` is the control's only property, and it is not configuration. The
Power Apps grid generates an event name, passes it in, and listens on it for the
cell renderers and editors this control fires during `init`. A maker never sets
it; an empty value means nothing is listening, and the control returns without
firing.

The customizer payload itself has no manifest representation — it is a runtime
object handed to the grid, described in
[Microsoft's grid customizer documentation](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/customize-editable-grid-control).
Which columns it changes is in the [Overview](overview.md).
