---
title: Installation
description: Import the solution, then name the control on a table's grid.
order: 2
---

# Installation

Importing the solution is half the job. A grid customizer does nothing until a
table's grid is told to use it — that second step is where this kind of control
is usually lost.

## 1. Import the solution

:::steps
1. Download the **managed** solution for your environment.
2. In the Power Platform admin centre, import the solution.
3. Publish all customizations.
:::

:::callout{type=warning}
Import the managed solution into production. The unmanaged one is for a
development environment where you intend to change the control itself — it
cannot be cleanly uninstalled.
:::

## 2. Assign it to a grid

:::steps
1. Open **Settings → Customizations → Customize the system**.
2. Under **Entities**, select the table whose grid you want to change — for
   example **Account**.
3. Open the **Controls** tab in the right-hand panel.
4. From **Controls**, add the **Power Apps grid control** if the table is not
   already using it, and enable it for Web, Phone and Tablet as appropriate.
5. In **Properties**, set **Customizer control** to this control's full logical
   name.
6. **Save and publish** the customizations for this table.
7. Open the table's main grid and confirm the cells render through the control.
:::

The full logical name is `{publisher prefix}_{namespace}.{control name}`, which
for the shipped solution is:

```text
pcfhub_PCFHub.GridCellStyler
```

Repeat step 2 for every table whose grid should use it. A customizer applies to
the table's grid, not to the environment.

:::callout{type=warning}
That `pcfhub_` prefix is the **solution's** publisher prefix, so it is only the
right answer if you imported the solution above. If you deployed the control
yourself with `pac pcf push --publisher-prefix dev`, the control went into a
different publisher and its logical name is `dev_PCFHub.GridCellStyler`. Pasting
the wrong prefix is not an error — the grid just renders its own cells, exactly
as if no customizer had been set.

Read the real name out of the environment rather than assembling it:

```text
/api/data/v9.2/customcontrols?$select=name&$filter=contains(name,'GridCellStyler')
```
:::

:::callout{type=info}
Microsoft documents this assignment step for every grid customizer, not just
this one:
[Customize the editable grid control](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/customize-editable-grid-control).
:::

## Checking it worked

Open the table's main grid. If the columns look unchanged:

- Confirm the grid is using the **Power Apps grid control** and not the legacy
  read-only or editable grid — the customizer property only exists on the former.
- Confirm **Customizer control** holds the full logical name, with the publisher
  prefix that matches how the control was actually deployed — see the warning
  above, and check it against `customcontrols` rather than against this page.
- Confirm the customizations were published after the property was set.

Nothing is logged when a customizer is not assigned; the grid simply renders its
own cells, which is why each of these looks identical from the outside.
