/**
 * Tests for the Actions Tab module
 * Updated for Foundry v13 / dnd5e v5.x APIs
 */

import { createTestActor, MockItem } from "./setup";
import { MODULE_ID, ACTION_TYPES, ActionsTab } from "../scripts/actions-tab";

describe("ActionsTab Module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    test("should register settings and hooks on init", () => {
      ActionsTab.init();

      // Verify settings were registered
      expect(game.settings.register).toHaveBeenCalledWith(
        MODULE_ID,
        "autoPopulate",
        expect.any(Object)
      );

      expect(game.settings.register).toHaveBeenCalledWith(
        MODULE_ID,
        "displayCategories",
        expect.any(Object)
      );

      // Verify settings use raw i18n keys (not localized calls)
      const autoPopulateCall = game.settings.register.mock.calls.find(
        (c) => c[1] === "autoPopulate"
      );
      expect(autoPopulateCall[2].name).toBe(
        "ACTIONSTAB.Settings.AutoPopulate.Name"
      );

      // Verify hooks use v13 hook name
      expect(Hooks.on).toHaveBeenCalledWith(
        "renderCharacterActorSheet",
        expect.any(Function)
      );

      expect(Hooks.on).toHaveBeenCalledWith(
        "createItem",
        expect.any(Function)
      );
      expect(Hooks.on).toHaveBeenCalledWith(
        "updateItem",
        expect.any(Function)
      );
      expect(Hooks.on).toHaveBeenCalledWith(
        "deleteItem",
        expect.any(Function)
      );
    });
  });

  describe("Action Management", () => {
    test("should get actions for an actor using activities API", () => {
      const actor = createTestActor([
        { name: "Test Sword", type: "weapon", activationType: "action" },
        { name: "Test Spell", type: "spell", activationType: "bonus" },
        { name: "Test Reaction", type: "feat", activationType: "reaction" },
      ]);

      const actions = ActionsTab._getActionsForActor(actor);

      expect(game.settings.get).toHaveBeenCalledWith(MODULE_ID, "autoPopulate");
      expect(actions).toHaveLength(3);

      expect(actions.find((a) => a.name === "Test Sword").actionType).toBe(
        ACTION_TYPES.ACTION
      );
      expect(actions.find((a) => a.name === "Test Spell").actionType).toBe(
        ACTION_TYPES.BONUS_ACTION
      );
      expect(actions.find((a) => a.name === "Test Reaction").actionType).toBe(
        ACTION_TYPES.REACTION
      );
    });

    test("should auto-populate actions with activities-based items", () => {
      const actor = createTestActor([
        { name: "Test Sword", type: "weapon", activationType: "action" },
        { name: "Test Knife", type: "weapon", activities: [] }, // No activities
        { name: "Test Spell", type: "spell", activationType: "bonus" },
        { name: "Test Feature", type: "feat", activationType: "special" },
      ]);

      const existingActions = [
        {
          id: "custom1",
          name: "Custom Action",
          actionType: ACTION_TYPES.ACTION,
          img: "icons/svg/sword.svg",
        },
      ];

      const actions = ActionsTab._autoPopulateActions(actor, existingActions);

      // 1 existing + 3 from items (knife has no activities so skipped)
      expect(actions).toHaveLength(4);

      // Verify existing actions are preserved
      expect(actions.some((a) => a.id === "custom1")).toBeTruthy();

      // Verify items with activities are added
      expect(actions.some((a) => a.name === "Test Sword")).toBeTruthy();
      expect(actions.some((a) => a.name === "Test Spell")).toBeTruthy();
      expect(actions.some((a) => a.name === "Test Feature")).toBeTruthy();

      // Verify items without activities are not added
      expect(actions.some((a) => a.name === "Test Knife")).toBeFalsy();
    });

    test("should update existing actions when activity type changes", () => {
      const actor = createTestActor([
        { name: "Test Sword", type: "weapon", activationType: "bonus" },
      ]);

      const itemId = actor.items.values().next().value.id;

      // Existing action has stale actionType "action", but item now has "bonus"
      const existingActions = [
        {
          id: itemId,
          name: "Test Sword",
          actionType: ACTION_TYPES.ACTION,
          img: "icons/svg/sword.svg",
          type: "weapon",
        },
      ];

      const actions = ActionsTab._autoPopulateActions(actor, existingActions);

      // Should still be 1 action (updated in place, not duplicated)
      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe(itemId);
      expect(actions[0].actionType).toBe(ACTION_TYPES.BONUS_ACTION);
    });

    test("should skip unprepared spells during auto-populate", () => {
      const actor = createTestActor([
        {
          name: "Prepared Spell",
          type: "spell",
          activationType: "action",
          level: 1,
          preparation: { mode: "prepared", prepared: true },
        },
        {
          name: "Unprepared Spell",
          type: "spell",
          activationType: "action",
          level: 2,
          preparation: { mode: "prepared", prepared: false },
        },
      ]);

      const actions = ActionsTab._autoPopulateActions(actor, []);

      expect(actions).toHaveLength(1);
      expect(actions[0].name).toBe("Prepared Spell");
    });

    test("should always include cantrips regardless of preparation", () => {
      const actor = createTestActor([
        {
          name: "Fire Bolt",
          type: "spell",
          activationType: "action",
          level: 0,
          preparation: { mode: "prepared", prepared: false },
        },
      ]);

      const actions = ActionsTab._autoPopulateActions(actor, []);

      expect(actions).toHaveLength(1);
      expect(actions[0].name).toBe("Fire Bolt");
    });

    test("should always include always-prepared and innate spells", () => {
      const actor = createTestActor([
        {
          name: "Always Prepared",
          type: "spell",
          activationType: "action",
          level: 3,
          preparation: { mode: "always", prepared: false },
        },
        {
          name: "Innate Spell",
          type: "spell",
          activationType: "bonus",
          level: 1,
          preparation: { mode: "innate" },
        },
        {
          name: "Pact Spell",
          type: "spell",
          activationType: "action",
          level: 2,
          preparation: { mode: "pact" },
        },
        {
          name: "At Will",
          type: "spell",
          activationType: "action",
          level: 1,
          preparation: { mode: "atwill" },
        },
      ]);

      const actions = ActionsTab._autoPopulateActions(actor, []);

      expect(actions).toHaveLength(4);
    });

    test("should not filter non-spell items by preparation", () => {
      const actor = createTestActor([
        { name: "Sword", type: "weapon", activationType: "action" },
        { name: "Feature", type: "feat", activationType: "bonus" },
      ]);

      const actions = ActionsTab._autoPopulateActions(actor, []);

      expect(actions).toHaveLength(2);
    });

    test("should handle special activation type", () => {
      const actor = createTestActor([
        { name: "Special Ability", type: "feat", activationType: "special" },
      ]);

      const actions = ActionsTab._autoPopulateActions(actor, []);

      expect(actions).toHaveLength(1);
      expect(actions[0].actionType).toBe(ACTION_TYPES.SPECIAL);
    });

    test("should not store item.system in action flags", () => {
      const actor = createTestActor([
        { name: "Test Sword", type: "weapon", activationType: "action" },
      ]);

      const actions = ActionsTab._autoPopulateActions(actor, []);

      expect(actions[0]).toHaveProperty("id");
      expect(actions[0]).toHaveProperty("name");
      expect(actions[0]).toHaveProperty("img");
      expect(actions[0]).toHaveProperty("actionType");
      expect(actions[0]).toHaveProperty("type");
      expect(actions[0]).not.toHaveProperty("system");
    });

    test("should update actions when items change", () => {
      const actor = createTestActor([
        { name: "Test Sword", type: "weapon", activationType: "action" },
      ]);

      const setFlagSpy = jest.spyOn(actor, "setFlag");
      const item = actor.items.values().next().value;

      ActionsTab._onItemChange(item);

      expect(game.settings.get).toHaveBeenCalledWith(MODULE_ID, "autoPopulate");
      expect(setFlagSpy).toHaveBeenCalledWith(
        MODULE_ID,
        "actions",
        expect.any(Array)
      );
    });

    test("should remove actions when items are deleted", () => {
      const actor = createTestActor([
        { name: "Test Sword", type: "weapon", activationType: "action" },
      ]);

      const itemId = actor.items.values().next().value.id;
      const existingActions = [
        { id: itemId, name: "Test Sword", actionType: ACTION_TYPES.ACTION },
      ];
      actor._flags[`${MODULE_ID}.actions`] = existingActions;

      const setFlagSpy = jest.spyOn(actor, "setFlag");
      const item = actor.items.values().next().value;

      ActionsTab._onItemDelete(item);

      expect(setFlagSpy).toHaveBeenCalledWith(MODULE_ID, "actions", []);
    });
  });

  describe("Spell Preparation Check", () => {
    test("should mark unprepared spells as not prepared", () => {
      const item = new MockItem({
        type: "spell",
        level: 2,
        preparation: { mode: "prepared", prepared: false },
      });

      expect(ActionsTab._isSpellPrepared(item)).toBe(false);
    });

    test("should mark prepared spells as prepared", () => {
      const item = new MockItem({
        type: "spell",
        level: 2,
        preparation: { mode: "prepared", prepared: true },
      });

      expect(ActionsTab._isSpellPrepared(item)).toBe(true);
    });

    test("should always return true for non-spell items", () => {
      const item = new MockItem({ type: "weapon" });

      expect(ActionsTab._isSpellPrepared(item)).toBe(true);
    });

    test("should treat cantrips as always prepared", () => {
      const item = new MockItem({
        type: "spell",
        level: 0,
        preparation: { mode: "prepared", prepared: false },
      });

      expect(ActionsTab._isSpellPrepared(item)).toBe(true);
    });
  });

  describe("Exclusion List", () => {
    test("should skip excluded items in auto-populate", () => {
      const actor = createTestActor([
        { id: "item1", name: "Sword", type: "weapon", activationType: "action" },
        { id: "item2", name: "Shield Bash", type: "feat", activationType: "bonus" },
      ]);
      actor._flags[`${MODULE_ID}.excludedActions`] = ["item2"];

      const actions = ActionsTab._autoPopulateActions(actor, []);
      expect(actions).toHaveLength(1);
      expect(actions[0].name).toBe("Sword");
    });

    test("should add to actions tab and remove from exclusion list", async () => {
      const actor = createTestActor([
        { id: "item1", name: "Sword", type: "weapon", activationType: "action" },
      ]);
      actor._flags[`${MODULE_ID}.excludedActions`] = ["item1"];
      const item = actor.items.get("item1");

      await ActionsTab._addToActionsTab(actor, item);

      const actions = actor.getFlag(MODULE_ID, "actions");
      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe("item1");

      const excluded = actor.getFlag(MODULE_ID, "excludedActions");
      expect(excluded).not.toContain("item1");
    });

    test("should remove from actions tab and add to exclusion list", async () => {
      const actor = createTestActor([
        { id: "item1", name: "Sword", type: "weapon", activationType: "action" },
      ]);
      actor._flags[`${MODULE_ID}.actions`] = [
        { id: "item1", name: "Sword", actionType: "action", img: "icons/svg/sword.svg", type: "weapon" },
      ];

      await ActionsTab._removeFromActionsTab(actor, "item1");

      const actions = actor.getFlag(MODULE_ID, "actions");
      expect(actions).toHaveLength(0);

      const excluded = actor.getFlag(MODULE_ID, "excludedActions");
      expect(excluded).toContain("item1");
    });

    test("should clean exclusion list when item is deleted", () => {
      const actor = createTestActor([
        { id: "item1", name: "Sword", type: "weapon", activationType: "action" },
      ]);
      actor._flags[`${MODULE_ID}.actions`] = [
        { id: "item1", name: "Sword", actionType: "action" },
      ];
      actor._flags[`${MODULE_ID}.excludedActions`] = ["item1", "item2"];

      const item = actor.items.get("item1");
      const setFlagSpy = jest.spyOn(actor, "setFlag");

      ActionsTab._onItemDelete(item);

      // Should have cleaned both the actions and exclusion list
      expect(setFlagSpy).toHaveBeenCalledWith(MODULE_ID, "actions", []);
      expect(setFlagSpy).toHaveBeenCalledWith(MODULE_ID, "excludedActions", ["item2"]);
    });

    test("should not duplicate items in actions list via _addToActionsTab", async () => {
      const actor = createTestActor([
        { id: "item1", name: "Sword", type: "weapon", activationType: "action" },
      ]);
      actor._flags[`${MODULE_ID}.actions`] = [
        { id: "item1", name: "Sword", actionType: "action", img: "icons/svg/sword.svg", type: "weapon" },
      ];
      const item = actor.items.get("item1");

      await ActionsTab._addToActionsTab(actor, item);

      const actions = actor.getFlag(MODULE_ID, "actions");
      expect(actions).toHaveLength(1);
    });
  });

  describe("Reorder Actions", () => {
    test("should reorder within same category", async () => {
      const actor = createTestActor();
      actor._flags[`${MODULE_ID}.actions`] = [
        { id: "a", name: "A", actionType: "action" },
        { id: "b", name: "B", actionType: "action" },
        { id: "c", name: "C", actionType: "action" },
      ];

      // Move C before A
      await ActionsTab._reorderAction(actor, "c", "action", "a");

      const actions = actor.getFlag(MODULE_ID, "actions");
      expect(actions.map((a) => a.id)).toEqual(["c", "a", "b"]);
    });

    test("should reorder to end of category when insertBeforeId is null", async () => {
      const actor = createTestActor();
      actor._flags[`${MODULE_ID}.actions`] = [
        { id: "a", name: "A", actionType: "action" },
        { id: "b", name: "B", actionType: "action" },
        { id: "c", name: "C", actionType: "action" },
      ];

      // Move A to end
      await ActionsTab._reorderAction(actor, "a", "action", null);

      const actions = actor.getFlag(MODULE_ID, "actions");
      expect(actions.map((a) => a.id)).toEqual(["b", "c", "a"]);
    });

    test("should preserve cross-category order", async () => {
      const actor = createTestActor();
      actor._flags[`${MODULE_ID}.actions`] = [
        { id: "a1", name: "A1", actionType: "action" },
        { id: "b1", name: "B1", actionType: "bonus" },
        { id: "a2", name: "A2", actionType: "action" },
        { id: "b2", name: "B2", actionType: "bonus" },
      ];

      // Reorder A2 before A1: splice out a2, then insert before a1
      // After splice: [a1, b1, b2] → insert a2 at index 0 → [a2, a1, b1, b2]
      await ActionsTab._reorderAction(actor, "a2", "action", "a1");

      const actions = actor.getFlag(MODULE_ID, "actions");
      expect(actions.map((a) => a.id)).toEqual(["a2", "a1", "b1", "b2"]);
    });

    test("should no-op when action ID not found", async () => {
      const actor = createTestActor();
      const original = [
        { id: "a", name: "A", actionType: "action" },
      ];
      actor._flags[`${MODULE_ID}.actions`] = [...original];

      await ActionsTab._reorderAction(actor, "nonexistent", "action", "a");

      // Flag should not have been updated (setFlag not called)
      expect(actor.getFlag(MODULE_ID, "actions")).toEqual(original);
    });
  });

  describe("Action Type Detection", () => {
    test("should detect action type from item activities", () => {
      const item = new MockItem({ activationType: "bonus" });
      expect(ActionsTab._getActionTypeFromItem(item)).toBe(ACTION_TYPES.BONUS_ACTION);
    });

    test("should return null for items without activities", () => {
      const item = new MockItem({ activities: [] });
      expect(ActionsTab._getActionTypeFromItem(item)).toBeNull();
    });

    test("should return null for unknown activation types", () => {
      const item = new MockItem({
        activities: [{ activation: { type: "legendary" } }],
      });
      expect(ActionsTab._getActionTypeFromItem(item)).toBeNull();
    });
  });

  describe("UI Integration", () => {
    test("should only add tab to character sheets", () => {
      const npcActor = createTestActor();
      npcActor.type = "npc";

      const npcApp = {
        actor: npcActor,
      };

      const element = document.createElement("div");
      ActionsTab._onRenderCharacterSheet(npcApp, element, {}, {});

      // Should return early for non-character actors — no actions tab added
      expect(element.querySelector('[data-tab="actions"]')).toBeNull();
    });

    test("should create detail panel with correct item data", () => {
      const actor = createTestActor([
        { id: "item1", name: "Warhammer", type: "weapon", activationType: "action", description: "<p>A heavy weapon</p>" },
      ]);
      const app = { actor, render: jest.fn() };

      const panel = ActionsTab._createDetailPanel(actor, "item1", app);

      expect(panel).not.toBeNull();
      expect(panel.dataset.actionId).toBe("item1");
      expect(panel.querySelector(".detail-panel-name").textContent).toBe("Warhammer");
      expect(panel.querySelector(".detail-panel-description").innerHTML).toContain("A heavy weapon");
    });

    test("should return null for missing item in detail panel", () => {
      const actor = createTestActor();
      const app = { actor };

      const panel = ActionsTab._createDetailPanel(actor, "nonexistent", app);
      expect(panel).toBeNull();
    });

    test("detail panel use button should call item.use()", () => {
      const actor = createTestActor([
        { id: "item1", name: "Warhammer", type: "weapon", activationType: "action" },
      ]);
      const item = actor.items.get("item1");
      const useSpy = jest.spyOn(item, "use");
      const app = { actor, render: jest.fn() };

      const panel = ActionsTab._createDetailPanel(actor, "item1", app);
      const useBtn = panel.querySelector(".detail-panel-use");
      useBtn.click();

      expect(useSpy).toHaveBeenCalled();
    });

    test("detail panel sheet button should call item.sheet.render()", () => {
      const actor = createTestActor([
        { id: "item1", name: "Warhammer", type: "weapon", activationType: "action" },
      ]);
      const item = actor.items.get("item1");
      const app = { actor, render: jest.fn() };

      const panel = ActionsTab._createDetailPanel(actor, "item1", app);
      const sheetBtn = panel.querySelector(".detail-panel-sheet");
      sheetBtn.click();

      expect(item.sheet.render).toHaveBeenCalledWith(true);
    });

    test("should open config dialog with ApplicationV2 API", () => {
      const actor = createTestActor();
      const app = { actor };

      const event = { preventDefault: jest.fn() };

      // This should not throw - it creates an ActionsConfig with { actor }
      expect(() => {
        ActionsTab._onConfigureActions(app, event);
      }).not.toThrow();

      expect(event.preventDefault).toHaveBeenCalled();
    });

    test("should register dnd5e context menu hook", () => {
      ActionsTab.init();
      expect(Hooks.on).toHaveBeenCalledWith(
        "dnd5e.getItemContextOptions",
        expect.any(Function)
      );
    });
  });
});
