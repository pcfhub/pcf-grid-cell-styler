/*
 * The stand-in grid: enough of the host for a customizer to run against.
 *
 * Loaded before the control bundle, because the bundle registers itself on load
 * and needs somewhere to register. Everything it needs is set up here and the
 * page calls `window.__harnessStart()` once the bundle has run.
 *
 * Read `harness.html` first — it says what this is for and what it is not.
 *
 * This is a port of `pcf-grid-data-bars/dev/harness.js`, which is the only other
 * customizer harness in the house. The plumbing is the same because the contract
 * is; the fixture is not, because this control overrides four column types by
 * what they *are* rather than one by what it holds.
 */

(function () {
    'use strict';

    /* ------------------------------------------------------------- fixture */

    /*
     * One column per override, plus a primary name column the control leaves
     * alone — because "declines to render" is a decision this page should show
     * as clearly as the ones that draw something.
     *
     * `width` is load-bearing for the Text override: it decides whether a value
     * is clipped, and therefore whether the cell gets a tooltip or is handed
     * back to the grid untouched. The narrow column is narrow on purpose.
     *
     * Inline rather than read from `demo/`, because this page runs over
     * `file://` where `fetch` is blocked.
     */
    var COLUMNS = [
        { name: 'name', displayName: 'Account', dataType: 'SingleLine.Text', columnDataType: 'Text', isPrimary: true, width: 320 },
        { name: 'notes', displayName: 'Notes', dataType: 'SingleLine.Text', columnDataType: 'Text', isPrimary: false, width: 140 },
        { name: 'balance', displayName: 'Balance', dataType: 'Currency', columnDataType: 'Currency', isPrimary: false, rightAligned: true, width: 130 },
        { name: 'active', displayName: 'Active', dataType: 'TwoOptions', columnDataType: 'TwoOptions', isPrimary: false, width: 110 },
        { name: 'stage', displayName: 'Stage', dataType: 'OptionSet', columnDataType: 'OptionSet', isPrimary: false, width: 150 },
    ];

    /*
     * Values chosen for the edges rather than the middle: an empty string and a
     * null, a text value long enough to clip in a 140px column and one short
     * enough not to, a negative and a zero balance, all three TwoOptions states
     * — true, false, and the null a column nobody has answered yet reports —
     * and repeated option labels, so the colour a pill gets can be seen to be
     * stable rather than random.
     */
    var ROWS = [
        { __rec_id: '1', name: 'Northwind Traders', notes: 'Renewal paperwork sent to legal', balance: 125000, active: true, stage: 'Proposal' },
        { __rec_id: '2', name: 'Contoso Ltd', notes: 'Short', balance: -38000, active: false, stage: 'Qualify' },
        { __rec_id: '3', name: 'Fabrikam', notes: '', balance: 0, active: true, stage: 'Proposal' },
        { __rec_id: '4', name: 'Adventure Works', notes: 'Waiting on the signed order form', balance: 410000, active: null, stage: 'Closed won' },
        { __rec_id: '5', name: 'Litware', notes: null, balance: null, active: false, stage: 'Closed lost' },
    ];

    /* ------------------------------------------------------- host plumbing */

    var registered = null;
    var payload = null;
    var instance = null;

    /*
     * What the bundle looks for on load. The real platform defines this; so
     * does PCFHub's demo harness, which is why the release workflow can attach
     * the ordinary build output and have it work as a demo.
     *
     * **Two arguments, not three.** `pcf-scripts` emits
     * `registerControl('Namespace.Control', ctor)` — the namespace and the
     * constructor name arrive already joined into one string.
     */
    window.ComponentFramework = window.ComponentFramework || {};
    window.ComponentFramework.registerControl = function (fullName, ctor) {
        registered = ctor;
    };

    function buildContext(options) {
        return {
            parameters: {
                /*
                 * Any non-empty string. The control returns at its own guard
                 * when this is empty — which is exactly what it should do
                 * anywhere that is not a customized grid, because the grid is
                 * what supplies the name.
                 */
                EventName: { raw: options.named ? 'harness-customizer-event' : '' },
            },

            factory: {
                fireEvent: function (name, fired) {
                    payload = fired;
                },
                requestRender: function () {},
            },

            /*
             * The control reads no strings and no metadata — unlike
             * pcf-grid-data-bars, which needs a column's declared range. Every
             * decision this one makes is a pure function of the cell it was
             * handed, which is the whole reason it can be a renderer at all.
             */
            fluentDesignLanguage: { isDarkTheme: options.dark },

            userSettings: { languageId: 1033 },
        };
    }

    /* ------------------------------------------------------------ rendering */

    function overrideFor(columnDataType) {
        var overrides = (payload && payload.cellRendererOverrides) || {};

        return overrides[columnDataType];
    }

    function renderCell(column, columnIndex, row) {
        var override = overrideFor(column.columnDataType);
        var value = row[column.name];
        var formatted = value === null || value === undefined ? '' : String(value);

        if (override) {
            var element = override(
                {
                    value: value,
                    formattedValue: formatted,
                    columnDataType: column.columnDataType,
                    isRightAligned: Boolean(column.rightAligned),
                    rowHeight: 42,
                    columnEditable: true,
                    isRTLMode: false,
                    onCellClicked: function () {},
                    startEditing: function () {},
                    /*
                     * Always clear here. A fixture carries no attribute
                     * metadata and no save, so `validationError`, `secured` and
                     * `isRequired` are states this harness cannot produce —
                     * which means the branches that handle them are exactly the
                     * ones it cannot check. Confirm those on a real grid.
                     */
                    validationError: null,
                },
                {
                    colDefs: COLUMNS,
                    columnIndex: columnIndex,
                    rowData: { __rec_id: row.__rec_id },
                    allowTabKeyNavigation: false,
                },
            );

            /*
             * **`undefined` is the contract, not a failure.** A renderer that
             * declines hands the cell back to the grid, and the grid draws its
             * own. Rendering nothing here instead would make a declining
             * override look like a broken one.
             */
            if (element !== undefined && element !== null) {
                return { element: element, declined: false, text: formatted };
            }
        }

        return { element: null, declined: true, text: formatted };
    }

    function grid(root) {
        var template = COLUMNS.map(function (column) {
            return (column.width || 140) + 'px';
        }).join(' ');

        var wrap = document.createElement('div');
        wrap.className = 'harness-grid';

        var head = document.createElement('div');
        head.className = 'harness-headrow';
        head.style.gridTemplateColumns = template;

        COLUMNS.forEach(function (column) {
            var cell = document.createElement('div');
            cell.className = 'harness-cell';
            cell.textContent = column.displayName;
            head.appendChild(cell);
        });

        wrap.appendChild(head);

        ROWS.forEach(function (row) {
            var line = document.createElement('div');
            line.className = 'harness-row';
            line.style.gridTemplateColumns = template;

            COLUMNS.forEach(function (column, index) {
                var cell = document.createElement('div');
                cell.className = 'harness-cell';

                var rendered = renderCell(column, index, row);

                if (rendered.declined) {
                    /*
                     * The grid's own cell, drawn plainly, and marked so the
                     * page shows which cells this control chose not to touch.
                     */
                    cell.classList.add('harness-declined');
                    cell.textContent = rendered.text;
                } else {
                    window.ReactDOM.render(rendered.element, cell);
                }

                line.appendChild(cell);
            });

            wrap.appendChild(line);
        });

        root.appendChild(wrap);
    }

    function render() {
        var root = document.getElementById('harness-root');
        var status = document.getElementById('harness-status');

        root.innerHTML = '';

        if (typeof registered !== 'function') {
            status.textContent = 'No control registered — run npm run build, then reload.';

            return;
        }

        var options = {
            dark: document.getElementById('harness-dark').checked,
            named: document.getElementById('harness-named').checked,
        };

        payload = null;

        if (instance && instance.destroy) {
            instance.destroy();
        }

        instance = new registered();

        var context = buildContext(options);

        instance.init(context, function () {}, {}, document.createElement('div'));
        instance.updateView(context);

        document.body.classList.toggle('is-dark', options.dark);

        if (!payload) {
            status.textContent =
                'The control fired no customizer payload. With no event name that is correct — the grid is what supplies one.';

            return;
        }

        var kinds = Object.keys(payload.cellRendererOverrides || {});

        status.textContent =
            'Payload fired: ' + kinds.length + ' cell renderer override' + (kinds.length === 1 ? '' : 's') +
            ' (' + kinds.join(', ') + ')' +
            (payload.gridCustomizer ? ' — and a gridCustomizer, which the real grid ignores' : '');

        grid(root);
    }

    window.__harnessStart = function () {
        ['harness-dark', 'harness-named'].forEach(function (id) {
            document.getElementById(id).addEventListener('change', render);
        });

        render();
    };
})();
