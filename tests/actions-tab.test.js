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

  describe("UI Integration", () => {
    test("should only add tab to character sheets", () => {
      const npcActor = createTestActor();
      npcActor.type = "npc";

      const npcApp = {
        actor: npcActor,
      };

      // Should not throw and should return early
      const element = document.createElement("div");
      ActionsTab._onRenderCharacterSheet(npcApp, element, {}, {});

      // Verify no DOM manipulation happened (querySelector never called for tabs)
      expect(element.querySelector).not.toHaveBeenCalled();
    });

    test("should use item.use() instead of item.roll()", () => {
      const item = new MockItem();
      const itemId = item.id;

      const actor = createTestActor();
      actor.items.set(itemId, item);

      const app = { actor };

      // Create a mock DOM structure for the event
      const actionItemEl = {
        dataset: { actionId: itemId },
      };
      const event = {
        preventDefault: jest.fn(),
        currentTarget: {
          closest: jest.fn().mockReturnValue(actionItemEl),
        },
      };

      const useSpy = jest.spyOn(item, "use");

      ActionsTab._onActionRoll(app, event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(useSpy).toHaveBeenCalled();
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
  });
});
