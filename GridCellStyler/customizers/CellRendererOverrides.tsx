import { Label, TooltipHost } from '@fluentui/react';
import * as React from 'react';
import { CellRendererOverrides } from '../types';

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
 */
export const cellRendererOverrides: CellRendererOverrides = {
    /**
     * Text: keep the value, add the part the grid cannot — an em dash for
     * empty, and a tooltip for anything long enough to be clipped.
     *
     * Declines for ordinary short values, which is most of them: an override
     * that returned an element for every text cell would replace the grid's own
     * virtualized rendering with this one on every row of every text column,
     * for no visible difference.
     */
    Text: (props) => {
        const value = props.formattedValue ?? '';

        if (value === '') {
            return (
                <Label className="gcs-cell gcs-empty" aria-label="No value">
                    &mdash;
                </Label>
            );
        }

        if (value.length <= 28) {
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
        const value = typeof props.value === 'number' ? props.value : null;

        if (value === null) {
            return undefined;
        }

        const high = value >= 100000;
        const label = high ? 'Above 100,000' : 'Below 100,000';

        return (
            <Label
                className={`gcs-cell gcs-number ${high ? 'gcs-high' : 'gcs-low'}`}
                aria-label={`${props.formattedValue ?? String(value)}. ${label}.`}
            >
                {props.formattedValue}
            </Label>
        );
    },

    /**
     * TwoOptions: a mark and a word, rather than "true"/"false".
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
        const on = props.value === true;

        return (
            <Label className="gcs-cell gcs-boolean">
                <span
                    aria-hidden="true"
                    className={on ? 'gcs-yes' : 'gcs-no'}
                >
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
     * one column and wrong for every other.
     */
    OptionSet: (props) => {
        const value = props.formattedValue ?? '';

        if (value === '') {
            return undefined;
        }

        return (
            <span className={`gcs-pill gcs-pill-${hueOf(value)}`}>{value}</span>
        );
    },
};

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
