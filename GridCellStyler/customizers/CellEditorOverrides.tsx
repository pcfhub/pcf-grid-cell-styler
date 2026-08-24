import { TextField, Toggle } from '@fluentui/react';
import * as React from 'react';
import { CellEditorOverrides } from '../types';

/**
 * How each column type behaves once the cell *is* being edited.
 *
 * The contract is small and every part of it matters:
 *
 *   - `props.onChange(value)` stages a value. It does not commit one, and it
 *     does not close the editor.
 *   - `params.stopEditing()` commits and closes; `params.stopEditing(true)`
 *     discards and closes. An editor that never calls it is an editor the user
 *     cannot leave.
 *   - `props.charPress` is the keystroke that opened the cell, if the user
 *     started typing rather than clicking. Ignoring it swallows that first
 *     character, which reads as dropped input.
 *   - The grid may unmount an editor at any time. Nothing here may hold state
 *     that has to be flushed on the way out.
 *
 * Only the types with something to add are overridden. Everything else falls
 * through to the grid's own editor, which already knows how to edit a lookup,
 * a date or an option set against real metadata — none of which a customizer
 * is handed.
 */
export const cellEditorOverrides: CellEditorOverrides = {
    /**
     * Text: the platform's editor plus a character budget.
     *
     * Uncontrolled on purpose. A controlled input would need state, and state
     * in a cell editor is state the grid can unmount mid-keystroke; letting the
     * DOM hold the draft and staging every change through `onChange` keeps this
     * a pure function of its props, which is what the grid asks for.
     */
    Text: (props, params) => (
        <TextField
            className="gcs-editor"
            autoFocus
            defaultValue={
                // charPress is the character that opened the editor. Without
                // this line the user types "F" to start editing and the editor
                // opens showing the old value, having eaten the F.
                props.charPress ?? String(props.value ?? '')
            }
            borderless
            underlined
            ariaLabel="Edit value"
            onChange={(_event, next) => props.onChange(next ?? '')}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    params.stopEditing();
                }

                if (event.key === 'Escape') {
                    event.preventDefault();
                    params.stopEditing(true);
                }
            }}
            // Clicking away is a commit everywhere else in a grid, so it is one
            // here too. Without it the editor stays open behind the user.
            onBlur={() => params.stopEditing()}
        />
    ),

    /**
     * TwoOptions: commit on the toggle, because there is nothing else to wait
     * for.
     *
     * A yes/no cell has exactly one interaction, and asking for a second one to
     * confirm it would be worse than the default editor this replaces.
     */
    TwoOptions: (props, params) => (
        <Toggle
            className="gcs-editor gcs-toggle"
            defaultChecked={props.value === true}
            onText="Yes"
            offText="No"
            inlineLabel
            onChange={(_event, checked) => {
                props.onChange(checked === true);
                params.stopEditing();
            }}
        />
    ),
};
