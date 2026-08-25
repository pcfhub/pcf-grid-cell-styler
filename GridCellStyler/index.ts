import * as React from 'react';
import { IInputs, IOutputs } from './generated/ManifestTypes';
import { cellEditorOverrides } from './customizers/CellEditorOverrides';
import { cellRendererOverrides } from './customizers/CellRendererOverrides';
import { PAOneGridCustomizer } from './types';

/**
 * The attribute the stylesheet reads to pick its palette, and the number of
 * live controls publishing it.
 *
 * The count is what makes `destroy` safe. A page can hold more than one
 * customized grid, each instantiating this control, and the attribute is global
 * to the document — so an instance that cleared it on the way out would strip
 * the theme from grids still on screen. The last one to leave clears it.
 */
const THEME_ATTRIBUTE = 'data-gcs-theme';

let publishers = 0;

/**
 * A grid customizer: a control whose entire output is other controls' cells.
 *
 * Nothing here renders. `updateView` returns an empty fragment on purpose, and
 * the control's whole contribution is the payload fired below — the Power Apps
 * grid holds the renderers and editors and calls them per cell, for as long as
 * the grid is on screen.
 *
 * Assigned to a grid rather than dropped on a form: Settings → Customizations →
 * the table → Controls → Power Apps grid control → *Customizer control* =
 * `pcfhub_PCFHub.GridCellStyler`. See docs/installation.md — a customizer that is
 * built and imported but never named on a grid is silently inert, which is the
 * single most common way this kind of control appears broken.
 *
 * https://learn.microsoft.com/en-us/power-apps/developer/component-framework/customize-editable-grid-control
 */
export class GridCellStyler
    implements ComponentFramework.ReactControl<IInputs, IOutputs>
{
    /**
     * Whether the payload has reached the grid.
     *
     * The grid registers one customizer per grid and this control has exactly
     * one payload to give it, so firing twice would re-register the same
     * overrides against a host that never asked for them again.
     */
    private fired = false;

    public init(context: ComponentFramework.Context<IInputs>): void {
        publishers++;
        this.fire(context);
        this.publishTheme(context);
    }

    /**
     * Empty, and it has to stay that way.
     *
     * The grid is already rendering this control's work through the payload
     * fired below. Anything returned here would be drawn *beside* the grid, in
     * whatever container the host gave the customizer — which on a real grid is
     * a zero-size element nobody can see, and on a preview surface is a second
     * thing on screen competing with the cells.
     *
     * It still calls `fire`, because the event name is a *bound* property and a
     * bound property is not guaranteed to carry its value by the time `init`
     * runs. Firing only from `init` means a name that arrives one render later
     * is dropped permanently and the control is inert for the life of the grid
     * — with nothing logged, on the one surface where it was supposed to work.
     * The latch is what makes calling it from both places safe.
     */
    public updateView(
        context: ComponentFramework.Context<IInputs>,
    ): React.ReactElement {
        this.fire(context);
        this.publishTheme(context);

        return React.createElement(React.Fragment);
    }

    public getOutputs(): IOutputs {
        // `EventName` is bound, but the host writes it and this control never
        // does. An empty object is "no change to anything", which is the truth
        // here — not the usual bound-property case where omitting a value
        // silently refuses a clear.
        return {};
    }

    public destroy(): void {
        // The grid disposes the elements it mounted; the only thing held here
        // is the document-level theme attribute, and only until the last
        // customized grid on the page goes with it.
        publishers = Math.max(publishers - 1, 0);

        if (publishers === 0) {
            document.documentElement.removeAttribute(THEME_ATTRIBUTE);
        }
    }

    /**
     * Tell the stylesheet which theme the host is drawing in.
     *
     * The cells this control styles are mounted per cell with no provider and
     * no context above them, so a renderer cannot read the theme — but the
     * control can, and `:root` is the one element every cell of every grid
     * reliably inherits from. The stylesheet keys its dark palette off this
     * attribute.
     *
     * It used to key off `@media (prefers-color-scheme: dark)` instead, and
     * that is the wrong signal: a model-driven app carries its own theme,
     * independent of the operating system. A user on an OS-dark machine looking
     * at a light app got the dark palette — which for the values painted
     * straight onto the cell background, the empty-value dash and the currency
     * colours, is light grey text on white. The media query survives in the CSS
     * as a last resort for hosts that publish no theme at all, which is
     * strictly what every host did before this method existed.
     *
     * `fluentDesignLanguage` is typed as Fluent v9 theming data and this is a
     * Fluent 8 control, so the platform may simply not populate it here. That
     * is why an absent value writes nothing rather than assuming light: leaving
     * the attribute off is what hands the decision back to the media query,
     * and assuming would be the same guess this method was written to stop.
     */
    private publishTheme(context: ComponentFramework.Context<IInputs>): void {
        const isDarkTheme = context.fluentDesignLanguage?.isDarkTheme;

        if (isDarkTheme === undefined) {
            return;
        }

        document.documentElement.setAttribute(
            THEME_ATTRIBUTE,
            isDarkTheme ? 'dark' : 'light',
        );
    }

    /**
     * Hand the grid its renderers and editors, once.
     *
     * The event *name* comes from the host — the grid generates it and passes
     * it in through the bound property — so this control never invents one, and
     * an empty value means the grid is not listening and there is nothing to
     * fire at. That guard is not defensive coding: on any surface that is not a
     * customized grid (a form, a preview harness, a canvas app) this control is
     * a no-op by design, and firing a made-up event there would be noise.
     *
     * `factory.fireEvent` is cast through, because
     * `@types/powerapps-component-framework` does not declare it. The platform
     * has it; the type package has never caught up, and Microsoft's own
     * template does exactly this.
     */
    private fire(context: ComponentFramework.Context<IInputs>): void {
        if (this.fired) {
            return;
        }

        const eventName = context.parameters.EventName.raw;

        if (!eventName) {
            return;
        }

        const customizer: PAOneGridCustomizer = {
            cellRendererOverrides,
            cellEditorOverrides,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (context as any).factory.fireEvent(eventName, customizer);

        this.fired = true;
    }
}
