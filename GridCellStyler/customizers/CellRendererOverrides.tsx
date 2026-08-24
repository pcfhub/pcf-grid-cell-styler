import { Label, TooltipHost } from '@fluentui/react';
import * as React from 'react';
import {
    CellRendererOverrides,
    CellRendererProps,
    ColumnDefinition,
} from '../types';

/**
 * How each column type draws when the cell is *not* being edited.
 *
 * Keyed by the grid's own column data type, so an override applies to every
 * column of that type on the grid it is assigned to. Narrowing to one column is
 * done inside the function, off `colDefs[columnIndex].name` — the second
 * argument exists for exactly that.
 *
 * Three rules from the platform documentation shape everything below, and each
 * one is easy to break without noticing:
 *
 *   1. **Return null or undefined to decline.** That is not a failure path — it
 *      is how a customizer says "this column is fine as it is", and the grid
 *      then draws the cell itself. Several overrides here decline for most of
 *      their rows.
 *   2. **These functions must be pure.** The grid calls them repeatedly, in an
 *      order it does not promise, and expects the same element back for the
 *      same inputs. No state, no side effects, no writing to the record.
 *   3. **Never render a different value than the cell holds.** Sorting and
 *      filtering happen on the server against the real value, so a cell that
 *      displays something else produces a grid that sorts "wrongly" in front of
 *      a user who is reading the thing it sorted.
 *
 * Rule 3 is the one that reads as a style note and is not. It is why the yes/no
 * override below declines an unset cell rather than drawing it as "No", and why
 * the currency override restyles the platform's formatted value instead of
 * formatting one of its own.
 */
export const cellRendererOverrides: CellRendererOverrides = {
    /**
     * Text: keep the value, add the part the grid cannot — an em dash for
     * empty, and a tooltip for anything the column is too narrow to show.
     *
     * Declines for ordinary values that fit, which is most of them: an override
     * that returned an element for every text cell would replace the grid's own
     * virtualized rendering with this one on every row of every text column,
     * for no visible difference.
     */
    Text: (props, params) => {
        if (defersToGrid(props)) {
            return undefined;
        }

        const value = props.formattedValue ?? '';

        if (value === '') {
            return (
                <Label className="gcs-cell gcs-empty" aria-label="No value">
                    &mdash;
                </Label>
            );
        }

        if (!isClipped(value, params.colDefs[params.columnIndex])) {
            return undefined;
        }

        return (
            <TooltipHost content={value}>
                <Label className="gcs-cell gcs-truncate">{value}</Label>
            </TooltipHost>
        );
    },

    /**
     * Currency: colour by magnitude, and say so in text as well as colour.
     *
     * The colour is the point of the sample this pattern comes from; the
     * `aria-label` is the part that sample leaves out. Colour alone is not an
     * accessible signal, and a grid is exactly where a screen-reader user is
     * scanning for the same outliers a sighted user picks out by hue.
     */
    Currency: (props) => {
        if (defersToGrid(props)) {
            return undefined;
        }

        const value = typeof props.value === 'number' ? props.value : null;

        if (value === null) {
            return undefined;
        }

        const high = value >= HIGH_VALUE;
        const label = high ? 'Above 100,000' : 'Below 100,000';

        // The grid right-aligns numeric columns and tells the renderer that it
        // did. An override ignoring it leaves the column most likely to be
        // aligned as the only one that is not — a ragged edge against every
        // untouched numeric column beside it.
        const alignment = props.isRightAligned ? ' gcs-right' : '';

        return (
            <Label
                className={`gcs-cell gcs-number ${high ? 'gcs-high' : 'gcs-low'}${alignment}`}
                aria-label={`${props.formattedValue ?? String(value)}. ${label}.`}
            >
                {props.formattedValue}
            </Label>
        );
    },

    /**
     * TwoOptions: a mark and a word, rather than "true"/"false".
     *
     * **An unset cell declines.** A two-options column is nullable, and `null`
     * is not `false`: a record where nobody answered "do not email" is not a
     * record that said no. Drawing it as "No" breaks rule 3 above — the server
     * filters on the real value, so a user filtering for No gets a row count
     * that disagrees with the grid in front of them. Declining hands the cell
     * back to the grid, which already knows how to draw an unset one.
     *
     * The mark is a character, not a Fluent `<Icon>`, and that is deliberate.
     * Fluent 8's icons are a registered font: something has to call
     * `initializeIcons()` before any glyph resolves, and a cell renderer cannot
     * be the thing that does — it is mounted per cell inside a host that may
     * have registered a different set, and registering over it would change
     * icons the customizer does not own. An unregistered icon renders as
     * nothing at all, silently, which is what this column did until a demo
     * showed it empty.
     *
     * The word stays beside the mark because the mark alone would make the
     * column unreadable to anything that reads text rather than glyphs —
     * including the export a grid produces.
     */
    TwoOptions: (props) => {
        if (defersToGrid(props)) {
            return undefined;
        }

        if (props.value !== true && props.value !== false) {
            return undefined;
        }

        const on = props.value === true;

        return (
            <Label className="gcs-cell gcs-boolean">
                <span aria-hidden="true" className={on ? 'gcs-yes' : 'gcs-no'}>
                    {on ? '✓' : '×'}
                </span>
                {on ? 'Yes' : 'No'}
            </Label>
        );
    },

    /**
     * OptionSet: a pill, coloured from the value itself.
     *
     * Deliberately derived from the string rather than from a table of known
     * choices: a customizer is assigned to a whole grid and sees whatever
     * option sets that table has, so a hard-coded palette would be right for
     * one column and wrong for every other. The cost is collisions, which
     * `docs/limitations.md` names.
     */
    OptionSet: (props) => {
        if (defersToGrid(props)) {
            return undefined;
        }

        const value = props.formattedValue ?? '';

        if (value === '') {
            return undefined;
        }

        return (
            <span className={`gcs-pill gcs-pill-${hueOf(value)}`}>{value}</span>
        );
    },
};

/** The magnitude a currency value has to reach before it reads as high. */
const HIGH_VALUE = 100000;

/**
 * Whether this cell is in a state the grid draws better than an override can.
 *
 * A renderer that returns an element replaces the *whole* cell, and the grid's
 * error affordance goes with it — the border, and the message the grid wired to
 * `cellErrorLabelId`. That label is an element this code does not own and
 * cannot rebuild, so a customizer that renders straight through a validation
 * error produces a cell that is quietly invalid and looks fine: nothing tells
 * the user, and the first signal that anything is wrong is a save that fails.
 *
 * So a cell carrying an error declines, and the grid draws the error it already
 * knows how to draw. Every override in this file opens with this check, which
 * is why it is a named function rather than four copies of one condition.
 */
function defersToGrid(props: CellRendererProps): boolean {
    return props.validationError != null;
}

const APPROX_CHAR_PX = 7;
const CELL_PADDING_PX = 16;
const FALLBACK_CHAR_BUDGET = 28;

/**
 * Roughly, whether `value` will be clipped by the column it is drawn in.
 *
 * A character count was the first cut at this and it was wrong in both
 * directions — a narrow column clipped text this file had declared short, and a
 * wide one drew tooltips over text that fit with room to spare. Width is what
 * actually clips, and the grid hands it over in `colDefs[columnIndex].width`.
 *
 * The estimate is deliberately crude. Measuring properly means a canvas
 * `measureText` per cell, and per-cell work is what the platform's "customizer
 * controls should be lightweight and fast" guidance rules out on a surface that
 * re-renders as it scrolls. Being approximately right costs the occasional
 * tooltip nobody needed; being exact costs the grid its scrolling.
 *
 * `width` is optional in the contract — an auto-sized column has none — so an
 * absent width falls back to the character budget this replaced.
 */
function isClipped(value: string, column?: ColumnDefinition): boolean {
    const width = column?.width;

    if (width === undefined) {
        return value.length > FALLBACK_CHAR_BUDGET;
    }

    return value.length * APPROX_CHAR_PX > width - CELL_PADDING_PX;
}

/**
 * A stable bucket for a string, so the same option always gets the same colour.
 *
 * Stability is what makes this useful rather than decorative — a pill that
 * changed colour between renders would be worse than no colour at all, and
 * "pure function of the value" is also what the grid requires of everything in
 * this file.
 */
function hueOf(value: string): number {
    let hash = 0;

    for (let index = 0; index < value.length; index++) {
        hash = (hash * 31 + value.charCodeAt(index)) % 997;
    }

    return hash % 6;
}
