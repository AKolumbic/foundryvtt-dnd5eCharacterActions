# Actions Tab 5e

![Downloads Latest](https://img.shields.io/github/downloads/akolumbic/foundryvtt-dnd5eCharacterActions/latest/module.zip?color=blue)
[![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fcharacter-actions-list-5e&colorB=4aa94a)](https://forge-vtt.com/bazaar#package=character-actions-list-5e)
[![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fcharacter-actions-list-5e%2Fshield%2Fendorsements)](https://www.foundryvtt-hub.com/package/character-actions-list-5e/)
[![Foundry Hub Comments](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fcharacter-actions-list-5e%2Fshield%2Fcomments)](https://www.foundryvtt-hub.com/package/character-actions-list-5e/)

![Foundry Minimum Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fakolumbic%2Ffoundryvtt-dnd5eCharacterActions%2Fmain%2Fsrc%2Fmodule.json&query=%24.compatibility.minimum&label=Minimum%20Core%20Version&color=orange)
![Foundry Recommended Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fakolumbic%2Ffoundryvtt-dnd5eCharacterActions%2Fmain%2Fsrc%2Fmodule.json&query=%24.compatibility.verified&label=Recommended%20Core%20Version&color=green)
![Manifest+ Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fakolumbic%2Ffoundryvtt-dnd5eCharacterActions%2Fmain%2Fsrc%2Fmodule.json&query=%24.manifestPlusVersion&label=Manifest%2B%20Version&color=blue)

## Current Maintainer

This module is now maintained by [akolumbic](https://github.com/akolumbic) to ensure continued compatibility with the latest Foundry VTT versions.

This module provides a placable reusable "component" which details all of the actions a given Character Actor can take, intending to replicate the list in the Actions Tab of the D&DBeyond character sheet. The module has two ways in which it can be used: it will either inject the actions tab itself, or another module can leverage the API it provides and use that to inject the proper HTML wherever it desires.

## Latest Changes (v7.2.1)

- Updated compatibility with Foundry VTT v12 (verified with 12.331)
- Compatible with D&D 5e system version 4.0.0
- Improved layout with flex display for proper rendering
- Fixed a bug where removing items from the Actions List caused the component to appear blank

## List Features

By default the list will attempt to narrow down your active abilities, items, and spells into the ones most likely to be useful in combat. The full logic for the filter is in `isItemInActionList` inside `src/module/scripts/api.js`. Here are the basics:

For Weapons:

- Is it equipped?

For Equipment:

- Does it have an activation cost (excluding anything that takes longer than a minute or none) and is it equipped?

For Consumables:

- If the "Include Consumables" setting is set, does it have an activation cost (excluding anything that takes longer than a minute or none)?

For Spells:

- If the spell needs to be prepared but isn't, exclude it.
- Does it do damage (or healing)?
- Does it have an activation cost of 1 reaction or 1 bonus action?
- If the "Include Minute-long Spells" setting is set, does it have a duration of up to 1 minute (1 round - 1 minute)?
- If the "Include Spells With Effects" setting is set, does the spell have any active effects?

For Features:

- Does it have an activation cost (excluding anything that takes longer than a minute or none)?

Additionally, you can override the default list by selectively including or excluding items by toggling the little Fist in item controls.

## Installation

Module JSON:

```
https://github.com/akolumbic/foundryvtt-dnd5eCharacterActions/releases/latest/download/module.json
```

## Options

| **Name**                                          | Description                                                                                                                                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Limit Actions to Cantrips**                     | Instead of showing all spells that deal damage in the Actions list, limit it to only cantrips. This is the default D&DBeyond behavior.                                                               |
| **Include Minute-long Spells as Actions**         | Include spells with a duration of one minute or less (e.g. 1 round) and an activation time of 1 Action or 1 Bonus Action (e.g. Bless, Bane, Command) in the Actions tab/panel by default.            |
| **Include Spells with Active Effects as Actions** | Include spells with active effects attached (e.g. Barkskin) in the Actions tab/panel by default.                                                                                                     |
| **Include Consumables as Actions**                | Include consumables which have an activation cost (Action, Bonus Action, etc) in the Actions list by default.                                                                                        |
| **Inject Character Actions List**                 | Should this module inject an Actions List into the default character sheet? Note that if you are using a sheet module which integrates the actions list on its own, this will not affect that sheet. |
| **Inject NPC Actions List**                       | Should this module inject an Actions List into the default npc sheet? Note that if you are using a sheet module which integrates the actions list on its own, this will not affect that sheet.       |
| **Inject Vehicle Actions List**                   | Should this module inject an Actions List into the default vehicle sheet? Note that if you are using a sheet module which integrates the actions list on its own, this will not affect that sheet.   |

## API

After the hook `CharacterActions5eReady` is fired, the following api methods are expected to be available in the `game.modules` entry for this module: `game.modules.get('character-actions-list-5e').api`:

### `async renderActionsList(actorData: Actor5eCharacter, appId: number): HTMLElement`

Returns the output of `renderTemplate` (an `HTMLElement`) after getting the provided actor's action data. This can then be injected wherever in your own DOM.

### Example

```ts
class MyCoolCharacterSheet extends ActorSheet5e {
  // other stuff your sheet module does...

  async _renderInner(...args) {
    const html = await super._renderInner(...args);
    const actionsListApi = game.modules.get('character-actions-list-5e').api;

    try {
      const actionsTab = html.find('.actions');

      const actionsTabHtml = $(await actionsListApi.renderActionsList(this.actor));
      actionsTab.html(actionsTabHtml);
    } catch (e) {
      log(true, e);
    }

    return html;
  }
}
```

### `isItemInActionList(item: Item5e): boolean`

A handlebars helper is provided as well in case any sheet wants an easy way to check if an Item being rendered is expected to be part of the Actions List. `CAL5E-isItemInActionList` is a simple wrapper around `isItemInActionList`, it expects the same argument of an `item` instance.

#### Example

```ts
class MyCoolItemSheet extends ItemSheet5e {
  // other stuff your sheet module does...

  getData() {
    // const data = { someOtherStuff };
    const actionsListApi = game.modules.get('character-actions-list-5e').api;

    try {
      data.isInActionList = actionsListApi.isItemInActionList(this.item);
    } catch (e) {
      log(true, e);
    }

    return data;
  }
}
```

### `getActorActionsData(actor: Actor5e): ActorActionsList`

```ts
type ActorActionsList = Record<
  'action' | 'bonus' | 'crew' | 'lair' | 'legendary' | 'reaction' | 'other',
  Set<Partial<Item5e>>
>;
```

When passed an actor, returns the actor's 'actions list' items organized by activation type. I'm not sure why but it seems some of the information is missing from the Item5e in this list, be wary of that if you are looking to use this in another module.

### Handlebars Helper: `CAL5E-isItemInActionList`

A handlebars helper is provided as well in case any sheet wants an easy way to check if an Item being rendered is expected to be part of the Actions List. `CAL5E-isItemInActionList` is a simple wrapper around `isItemInActionList`, it expects the same argument of an `item` instance.

#### Example

```hbs
{{#each items as |item|}}
  {{! other stuff }}
  {{#if (CAL5E-isItemInActionList item)}}Action{{/if}}
{{/each}}
```

### Blocking the default Injection

If a sheet module wants to specifically block the injection of the actions tab without implementing the actions list itself, add `blockActionsTab` to the options being passed to the FormApplication class.

Note that by default, the actions tab will only inject itself if no DOM element with the class `.character-actions-dnd5e` exists in the Application being rendered.

#### Example

```js
// class SomeAwesomeSheet extends SomeActorSheetClass {
  // ...
  // get defaultOptions() {
    // return mergeObject(super.defaultOptions, {
      blockActionsTab: true,
    // ...
```

This will cause the Actions Tab's auto injection to stop before any DOM is injected.

### Compatibility

I'm honestly not sure how well this will play with modules that affect character sheets or dice rolls, I'll try to test as many as possible but if something is obviously breaking please create and issue here and I'll see what I can do.

| **Name**                                                                                            |       Works        | Notes                                                             |
| --------------------------------------------------------------------------------------------------- | :----------------: | ----------------------------------------------------------------- |
| [Ready Set Roll 5e](https://github.com/MangoFVTT/fvtt-ready-set-roll-5e)                            | :heavy_check_mark: | Seems to work well as a drop-in replacement for Better Rolls 5e   |
| [Better Rolls 5e](https://github.com/RedReign/FoundryVTT-BetterRolls5e)                             |        :x:         | Deprecated and no longer updated. Use Ready Set Roll instead.     |
| [Midi-QOL](https://gitlab.com/tposney/midi-qol)                                                     | :heavy_check_mark: | Works as expected.                                                |
| [Minimal Roll Enhancements](https://github.com/schultzcole/FVTT-Minimal-Rolling-Enhancements-DND5E) | :heavy_check_mark: | Works as expected.                                                |
| [Mars 5e](https://github.com/Moerill/fvtt-mars-5e)                                                  | :heavy_check_mark: | Works as expected.                                                |
| [FoundryVTT Magic Items](https://gitlab.com/riccisi/foundryvtt-magic-items)                         |      :shrug:       | Spells assigned to magic items do not appear in the Actions List. |
| [Inventory+](https://github.com/syl3r86/inventory-plus)                                             | :heavy_check_mark: | Inventory+ organization has no effect on Actions Tab              |

## Known Issues

- Using an item which changes charges or spell slots on any sheet that does not natively implement CharacterActions causes the tab to change.

## Acknowledgements

Mostly a thousand thanks to [Andrew Krigline](https://github.com/akrigline) for creating this module and making it so good to use and indispensable that I felt compelled to take it over when he couldn't maintain it any more.

Previously maintained by [eastcw](https://github.com/eastcw), now maintained by [akolumbic](https://github.com/akolumbic).

Code contributions by [jagoe](https://github.com/jagoe).

Bootstrapped with Nick East's [create-foundry-project](https://gitlab.com/foundry-projects/foundry-pc/create-foundry-project).

Mad props to the [League of Extraordinary FoundryVTT Developers](https://forums.forge-vtt.com/c/package-development/11) community which helped me figure out a lot.
