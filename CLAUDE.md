# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FoundryVTT module (id: `actions-tab-5e`) that adds an "Actions" tab to D&D 5e character sheets. It categorizes character abilities by action type (Action, Bonus Action, Reaction, Special) and supports drag-and-drop organization. Targets FoundryVTT v13 with dnd5e system v5.0.0+.

## Commands

- **Build** (copies files to `dist/` and creates zip in `package/`): `npm run build`
- **Watch** (auto-copies on file change): `npm run dev`
- **Test**: `npm test`
- **Single test file**: `npx jest tests/actions-tab.test.js`
- **Lint**: `npm run lint`

Dependencies must be installed first with `npm install`.

## Architecture

The module has two main ES modules loaded by FoundryVTT (declared in `module.json` `esmodules`):

- **`scripts/actions-tab.js`** — Entry point. Defines and exports `ActionsTab` (static class), `MODULE_ID`, and `ACTION_TYPES` constants. Registers Foundry settings and hooks (`renderCharacterActorSheet`, `createItem`, `updateItem`, `deleteItem`). Injects the Actions tab into character sheets using vanilla DOM APIs in the render hook. Hook signature is `(app, element, context, options)` where `element` is an `HTMLElement` (ApplicationV2 pattern). Exposes `window.ActionsTab` for macro use. Actor-specific action data is stored in Foundry flags at `actions-tab-5e.actions`.

- **`scripts/actions-config.js`** — `ActionsConfig` extends `HandlebarsApplicationMixin(ApplicationV2)`. Configuration dialog for managing which items appear in the Actions tab. Uses `static DEFAULT_OPTIONS` with `tag: "form"`, `actions` map for click handlers, and `static PARTS` for template. Implements drag-and-drop in `_onRender()` using vanilla DOM event listeners. Uses Handlebars template at `templates/actions-config.hbs`. Filters out `class` and `race` item types from available items.

Key patterns:
- Actions are persisted per-actor via `actor.getFlag(MODULE_ID, "actions")` / `actor.setFlag()`
- Auto-populate feature scans actor items via the **activities API** (`item.system.activities`) and maps `activity.activation.type` to action categories
- Item usage is via `item.use()` (not the deprecated `item.roll()`)
- Flag data stores only `id`, `name`, `img`, `actionType`, `type` (no `item.system`)
- Settings pass raw i18n key strings (Foundry v13 auto-localizes)
- All UI text uses `game.i18n.localize()` with keys from `languages/en.json` (prefix: `ACTIONSTAB.`)
- Template uses `data-action` attributes for ApplicationV2 action routing (no jQuery click handlers)

## Testing

Tests use Jest with Babel for ES module transform. `tests/setup.js` provides mock globals for the FoundryVTT v13 API (`game`, `Hooks`, `window`, `foundry.utils`, `foundry.applications.api`) and mock classes (`MockActor`, `MockItem`, `ActivitiesCollection`, `Collection`, `createTestActor`). Tests import source modules directly — no build step needed. Jest `setupFiles` points to `tests/setup.js`.

## Build

Gulp-based: `clean` → `copyFiles` → `createZip`. Output goes to `dist/` (flat copy) and `package/actions-tab-5e.zip` (distributable). Both directories are gitignored.
