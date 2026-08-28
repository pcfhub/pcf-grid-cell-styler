/*
 * Drives the real built bundle outside a browser.
 *
 *     npm run build && npm run smoke
 *
 * A **grid customizer** is not a control you can look at. Nothing it returns is
 * rendered — `updateView` hands back an empty fragment on purpose — and its
 * entire contribution is a payload of renderers and editors fired at the host
 * grid, which then calls them per cell. So there is no harness that shows you
 * whether it works: either the payload arrives with the right shape in it, or
 * the control is silently inert on the one surface it was built for.
 *
 * That is why this file exists and why it is the only thing that asserts
 * anything here. `npm start` renders an empty fragment beside a property panel,
 * which is exactly as informative as it sounds.
 *
 * **The document stub records instead of swallowing.** The version of this rig
 * in `_template` stubs `documentElement.setAttribute` as a no-op, which is
 * enough to stop `init` throwing and not enough to check what it wrote — and
 * what it writes is the whole theming mechanism, plus a reference count that
 * decides whether the last grid on a page takes the theme away from the others.
 * Recording it is the difference between running that code and testing it.
 *
 * **What passing here does NOT mean.** Every value below is supplied by this
 * file. It cannot tell you that the Power Apps grid calls these overrides, that
 * `factory.fireEvent` reaches it, or that a customizer named on a real grid is
 * wired up at all — the commonest way this kind of control appears broken is
 * being built, imported, and never named in the grid's Customizer control
 * setting. See SPEC.md and docs/installation.md.
 */

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.join(__dirname, '..');

const BUNDLE = path.join(root, 'out', 'controls', 'GridCellStyler', 'bundle.js');

if (!fs.existsSync(BUNDLE)) {
    console.error('\n  No bundle at out/controls/GridCellStyler. Run npm run build first.\n');
    process.exit(1);
}

const React = require(path.join(root, 'node_modules', 'react'));

/* ----------------------------------------------------------- the platform */

/*
 * The document, recording rather than discarding.
 *
 * `publishTheme` writes `data-gcs-theme` onto `:root`, because a cell renderer
 * is mounted per cell with no provider above it and cannot read a theme of its
 * own — the attribute is the one thing every cell reliably inherits from. And
 * `destroy` only clears it when the *last* customizer on the page goes, since a
 * page can hold several customized grids and the attribute is global to the
 * document.
 *
 * Both of those are decisions with a wrong answer that looks identical at
 * runtime, so both are asserted below, and neither can be if this object throws
 * the calls away.
 */
const attributes = new Map();
const attributeLog = [];

global.document = {
    documentElement: {
        setAttribute(name, value) {
            attributes.set(name, value);
            attributeLog.push(`set ${name}=${value}`);
        },
        removeAttribute(name) {
            attributes.delete(name);
            attributeLog.push(`remove ${name}`);
        },
        getAttribute(name) {
            return attributes.has(name) ? attributes.get(name) : null;
        },
    },
};

let registered = null;

// Two arguments, not three: pcf-scripts emits
// registerControl('PCFHub.GridCellStyler', ctor) with the name already joined.
// Reading the constructor from a third parameter gets `undefined`, and it
// surfaces later as "registered is not a constructor".
global.ComponentFramework = {
    registerControl: (fullName, ctor) => {
        registered = ctor;
    },
};

// The bundle's registration footer reads `window.ComponentFramework`, not the
// bare global — so `window` has to *be* the global rather than merely exist,
// or the control loads and registers nothing while every assertion below
// reports "registered is not a constructor".
global.window = global;

/*
 * Fluent **8**, not 9, and stubbed rather than loaded.
 *
 * A customizer's cells are mounted by the host grid with nowhere to put a
 * FluentProvider, so this control declares Fluent 8 — every component resolves
 * to its own name as an element type, and the props it was given survive for
 * inspection. These assertions are about what the overrides decide, not how
 * Fluent draws it.
 */
const fluentGlobals = [];
const source = fs.readFileSync(BUNDLE, 'utf8');

for (const name of new Set(source.match(/\bReactv[\w]*\b/g) || [])) {
    global[name] = React;
    fluentGlobals.push(name);
}

const fluent = new Proxy({}, { get: (_t, name) => (typeof name === 'string' ? name : undefined) });

for (const name of new Set(source.match(/\bFluentUIReact[\w]*\b/g) || [])) {
    global[name] = fluent;
}

vm.runInThisContext(source, { filename: 'bundle.js' });

/* ---------------------------------------------------------------- harness */

const results = [];

function check(label, ok, detail) {
    results.push({ ok, label, detail });
}

/** What the last `fireEvent` carried, and how many times it was called. */
function makeContext(options = {}) {
    const fired = [];

    const context = {
        parameters: { EventName: { raw: options.eventName === undefined ? 'grid-event' : options.eventName } },
        factory: {
            fireEvent: (name, payload) => {
                fired.push({ name, payload });
            },
            requestRender() {},
        },
        resources: { getString: (key) => `resx:${key}` },
        /*
         * Absent unless a test asks for it.
         *
         * `fluentDesignLanguage` is typed as Fluent v9 theming data and this is
         * a Fluent 8 control, so the platform may simply not populate it here.
         * Absent is therefore the honest default, and it is the state in which
         * `publishTheme` must write nothing at all — handing the decision back
         * to the stylesheet's media query rather than guessing light.
         */
        fluentDesignLanguage: options.dark === undefined ? undefined : { isDarkTheme: options.dark },
        mode: { contextInfo: { entityTypeName: 'account' } },
        page: { getClientUrl: () => 'https://contoso.crm.dynamics.com' },
        utils: {
            getEntityMetadata: () => Promise.resolve({ Attributes: { get: () => undefined } }),
        },
    };

    return { context, fired };
}

check('bundle registered a control', typeof registered === 'function');

if (typeof registered !== 'function') {
    report();
}

/* -------------------------------------------------------------- the payload */

const first = makeContext();
const instance = new registered();

instance.init(first.context, () => {}, {}, {});

check('fires its payload as soon as it has an event name', first.fired.length === 1, `${first.fired.length} fires`);

check('at the name the host supplied, never one it invented', first.fired[0].name === 'grid-event', first.fired[0].name);

const payload = first.fired[0].payload;
const renderers = (payload && payload.cellRendererOverrides) || {};
const editors = (payload && payload.cellEditorOverrides) || {};

/*
 * `gridCustomizer` is deliberately not accepted as a surface on its own: the
 * shipping grid ignores that key, so a control whose only output is the chrome
 * members passes every local check and does nothing in a real grid. Requiring a
 * cell override is what stops this file certifying that.
 */
check(
    'the payload carries cell overrides rather than only grid chrome',
    Object.keys(renderers).length + Object.keys(editors).length > 0,
    `renderers: ${Object.keys(renderers).join(', ')}; editors: ${Object.keys(editors).join(', ')}`,
);

check(
    'renderers for every type this control claims to style',
    ['Text', 'Currency', 'TwoOptions', 'OptionSet'].every((type) => typeof renderers[type] === 'function'),
    Object.keys(renderers).join(', '),
);

check(
    'and editors only where it actually overrides one',
    typeof editors.Text === 'function' && typeof editors.TwoOptions === 'function',
    Object.keys(editors).join(', '),
);

/*
 * **The latch.** The grid registers one customizer per grid and this control
 * has exactly one payload for it, so firing again would re-register the same
 * overrides against a host that never asked.
 */
instance.updateView(first.context);
instance.updateView(first.context);

check('and never fires again, however many renders follow', first.fired.length === 1, `${first.fired.length} fires`);

/*
 * The event name is a *bound* property, and a bound property is not guaranteed
 * to carry its value by the time `init` runs. Firing only from `init` would
 * drop a name that arrives one render later and leave the control inert for the
 * life of the grid — with nothing logged, on the one surface where it matters.
 */
const late = makeContext({ eventName: '' });
const lateInstance = new registered();

lateInstance.init(late.context, () => {}, {}, {});

check('an empty event name fires nothing — there is no grid listening', late.fired.length === 0, `${late.fired.length} fires`);

late.context.parameters.EventName.raw = 'arrived-late';
lateInstance.updateView(late.context);

check(
    'but a name arriving one render later is still picked up',
    late.fired.length === 1 && late.fired[0].name === 'arrived-late',
    late.fired.map((f) => f.name).join(', ') || 'never fired',
);

check('updateView renders nothing of its own', lateInstance.updateView(late.context).type === React.Fragment);

/*
 * `EventName` is bound, but the host writes it and this control never does. An
 * empty object is "no change to anything", which is the truth here — not the
 * usual bound-property case where omitting a value silently refuses a clear.
 */
check('and writes nothing back to the property the host owns', Object.keys(lateInstance.getOutputs()).length === 0, JSON.stringify(lateInstance.getOutputs()));

/* --------------------------------------------------------------- the theme */

/*
 * A cell renderer cannot read a theme — it is mounted per cell with no provider
 * above it — so the control publishes one onto `:root` for the stylesheet.
 *
 * The signal is `fluentDesignLanguage.isDarkTheme` and **not**
 * `prefers-color-scheme`: a model-driven app carries its own theme, independent
 * of the operating system, so an OS-dark machine on a light app used to get the
 * dark palette — light grey text on white, for the values painted straight onto
 * the cell background.
 */
attributes.clear();

const dark = makeContext({ dark: true });
const darkInstance = new registered();

darkInstance.init(dark.context, () => {}, {}, {});

check('a dark host publishes a dark theme to the stylesheet', attributes.get('data-gcs-theme') === 'dark', attributes.get('data-gcs-theme'));

const light = makeContext({ dark: false });
const lightInstance = new registered();

lightInstance.init(light.context, () => {}, {}, {});

check('and a light host a light one', attributes.get('data-gcs-theme') === 'light', attributes.get('data-gcs-theme'));

/*
 * Absent means absent. A host that publishes no theme — which is every host
 * that was ever tested before this method existed, and may be every Fluent 8
 * surface — must leave the attribute off, handing the decision back to the
 * stylesheet's media query rather than guessing.
 */
attributes.clear();

const untold = makeContext();
const untoldInstance = new registered();

untoldInstance.init(untold.context, () => {}, {}, {});

check(
    'a host that publishes no theme is not guessed at',
    attributes.has('data-gcs-theme') === false,
    attributes.has('data-gcs-theme') ? attributes.get('data-gcs-theme') : 'not set',
);

/* ------------------------------------------------- what destroy owes, shared */

/*
 * **The reference count, which is the one piece of state shared between
 * instances.**
 *
 * A page can hold more than one customized grid, each instantiating this
 * control, and `data-gcs-theme` is global to the document. So an instance that
 * cleared it on the way out would strip the theme from grids still on screen.
 * Only the last one to leave may clear it — and that is invisible at runtime
 * until somebody puts two grids on a page.
 *
 * Every instance created above is still alive, so the count is unwound from
 * whatever it is rather than assumed to be two.
 */
attributes.clear();

const a = makeContext({ dark: true });
const b = makeContext({ dark: true });
const first2 = new registered();
const second = new registered();

first2.init(a.context, () => {}, {}, {});
second.init(b.context, () => {}, {}, {});

check('two customizers on a page both publish the theme', attributes.get('data-gcs-theme') === 'dark');

second.destroy();

check(
    'one of them leaving does not take the theme from the other',
    attributes.get('data-gcs-theme') === 'dark',
    attributes.has('data-gcs-theme') ? attributes.get('data-gcs-theme') : 'cleared too early',
);

/*
 * Unwind every instance this file created. The count is module-level and shared,
 * so the attribute goes only when the last of them is gone.
 */
for (const held of [instance, lateInstance, darkInstance, lightInstance, untoldInstance, first2]) {
    held.destroy();
}

check(
    'and the last one out clears it',
    attributes.has('data-gcs-theme') === false,
    attributes.has('data-gcs-theme') ? attributes.get('data-gcs-theme') : 'cleared',
);

/*
 * The count must not go negative, or a page that unmounts more than it mounted
 * leaves the next grid unable to publish a theme at all.
 */
new registered().destroy();

const recovered = makeContext({ dark: true });
const afterwards = new registered();

afterwards.init(recovered.context, () => {}, {}, {});

check(
    'an extra destroy does not break the next customizer',
    attributes.get('data-gcs-theme') === 'dark',
    attributes.has('data-gcs-theme') ? attributes.get('data-gcs-theme') : 'not set',
);

afterwards.destroy();

report();

function report() {
    const failed = results.filter((result) => !result.ok);

    for (const result of results) {
        const detail = result.detail ? `  — ${result.detail}` : '';

        console.log(`  ${result.ok ? 'ok  ' : 'FAIL'}  ${result.label}${detail}`);
    }

    console.log(
        failed.length > 0
            ? `\n  ${failed.length} of ${results.length} failed\n`
            : `\n  ${results.length} passed — the payload's shape and the control's own decisions; a real grid calling these overrides is still unverified\n`,
    );

    process.exit(failed.length > 0 ? 1 : 0);
}
