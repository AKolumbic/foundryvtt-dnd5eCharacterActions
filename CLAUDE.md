# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FoundryVTT module (id: `actions-tab-5e`) that adds an "Actions" tab to D&D 5e character sheets. It categorizes character abilities by action type (Action, Bonus Action, Reaction, Special) and supports drag-and-drop organization. Requires the `lib-wrapper` module. Targets FoundryVTT v11-12 with dnd5e system v4.0.0+.

## Commands

- **Build** (copies files to `dist/` and creates zip in `package/`): `npm run build`
- **Watch** (auto-copies on file change): `npm run dev`
- **Test**: `npm test`
- **Single test file**: `npx jest tests/actions-tab.test.js`
- **Lint**: `npm run lint`

Dependencies must be installed first with `npm install`.

## Architecture

The module has two main ES modules loaded by FoundryVTT (declared in `module.json` `esmodules`):

- **`scripts/actions-tab.js`** — Entry point. Defines `ActionsTab` (static class) and exports `MODULE_ID` and `ACTION_TYPES` constants. Registers Foundry settings and hooks (`renderActorSheet5eCharacter`, `createItem`, `updateItem`, `deleteItem`). Injects the Actions tab into character sheets by manipulating jQuery/DOM in the render hook. Exposes `window.ActionsTab` for macro use. Actor-specific action data is stored in Foundry flags at `actions-tab-5e.actions`.

- **`scripts/actions-config.js`** — `ActionsConfig` extends Foundry's `FormApplication`. Configuration dialog for managing which items appear in the Actions tab. Implements drag-and-drop between categories and from inventory. Uses Handlebars template at `templates/actions-config.hbs`. Filters out `class` and `race` item types from available items.

Key patterns:
- Actions are persisted per-actor via `actor.getFlag(MODULE_ID, "actions")` / `actor.setFlag()`
- Auto-populate feature scans actor items with `system.activation.type` and maps them to action categories
- All UI text uses `game.i18n.localize()` with keys from `languages/en.json` (prefix: `ACTIONSTAB.`)

## Testing

Tests use Jest with Babel for ES module transform. `tests/setup.js` provides mock globals for the FoundryVTT API (`game`, `Hooks`, `$`) and mock classes (`MockActor`, `MockItem`, `Collection`, `createTestActor`). Tests import source modules directly — no build step needed.

## Build

Gulp-based: `clean` → `copyFiles` → `createZip`. Output goes to `dist/` (flat copy) and `package/actions-tab-5e.zip` (distributable). Both directories are gitignored.
