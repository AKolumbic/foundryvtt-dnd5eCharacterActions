# Actions Tab 5e

![Foundry Minimum Version](https://img.shields.io/badge/Foundry-v13-orange)
![dnd5e Version](https://img.shields.io/badge/dnd5e-v5.0.0%2B-blue)
![Downloads Latest](https://img.shields.io/github/downloads/akolumbic/foundryvtt-dnd5eCharacterActions/latest/actions-tab-5e.zip?color=blue)

## Current Maintainer

This module is maintained by [akolumbic](https://github.com/akolumbic).

## Overview

Adds an **Actions** tab to the D&D 5e character sheet in Foundry VTT, organizing your character's abilities by action type:

- **Actions** — Standard actions (Attack, Cast a Spell, etc.)
- **Bonus Actions** — Bonus action abilities
- **Reactions** — Reactive abilities
- **Special** — Other activatable abilities

The module auto-populates actions from your character's items using the dnd5e v5.x **activities API**, and supports manual configuration via a drag-and-drop dialog.

## Compatibility

| Platform | Version |
|---|---|
| Foundry VTT | v13+ |
| dnd5e System | v5.0.0+ (verified 5.2.5) |

> **Note:** This is a complete rewrite (v8.0.0) for Foundry v13 and dnd5e v5.x. It is **not** compatible with Foundry v11/v12 or dnd5e v4.x. For older versions, use [v7.3.0](https://github.com/akolumbic/foundryvtt-dnd5eCharacterActions/releases/tag/v7.3.0).

## Installation

### Module JSON

```
https://github.com/akolumbic/foundryvtt-dnd5eCharacterActions/releases/latest/download/module.json
```

### Manual

Download `actions-tab-5e.zip` from the [latest release](https://github.com/akolumbic/foundryvtt-dnd5eCharacterActions/releases/latest) and extract it into your Foundry VTT `Data/modules/` directory.

## Features

- **Auto-populate**: Automatically detects items with activities (action, bonus action, reaction, special) and adds them to the Actions tab
- **Manual configuration**: Open the Configure dialog to drag items between categories or add/remove actions manually
- **Roll from tab**: Click the dice icon to use an item directly (`item.use()`)
- **Item info**: Click the info icon to open an item's sheet
- **Per-client settings**: Toggle auto-populate on/off, choose which action categories to display

## Settings

| Setting | Description |
|---|---|
| **Auto-populate Actions** | Automatically add actions from your character's items based on their activation type |
| **Display Categories** | Choose which categories of actions (Action, Bonus, Reaction, Special) to show |

## Development

```bash
npm install        # Install dependencies
npm test           # Run tests (Jest)
npm run build      # Build dist/ and package/actions-tab-5e.zip
npm run dev        # Watch mode (auto-copies on file change)
```

## Acknowledgements

Originally created by [Andrew Krigline](https://github.com/akrigline). Previously maintained by [eastcw](https://github.com/eastcw). Code contributions by [jagoe](https://github.com/jagoe).

v8.0.0 rewrite for Foundry v13 / dnd5e v5.x with assistance from [Claude Code](https://claude.com/claude-code).
