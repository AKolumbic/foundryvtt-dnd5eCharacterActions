/**
 * Tests for the Actions Configuration dialog
 * Updated for ApplicationV2 + HandlebarsApplicationMixin (Foundry v13)
 */

import { createTestActor, MockItem } from "./setup";
import { ACTION_TYPES } from "../scripts/actions-tab";
import { ActionsConfig } from "../scripts/actions-config";

describe("ActionsConfig Dialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    test("should initialize with actor via options", () => {
      const actor = createTestActor([
        { name: "Test Sword", type: "weapon", activationType: "action" },
        { name: "Test Spell", type: "spell", activationType: "bonus" },
      ]);

      const existingActions = [
        {
          id: "custom1",
          name: "Custom Action",
          actionType: ACTION_TYPES.ACTION,
          img: "icons/svg/sword.svg",
        },
      ];
      actor._flags["actions-tab-5e.actions"] = existingActions;

      // ApplicationV2 style: actor passed via options
      const dialog = new ActionsConfig({ actor });

      expect(dialog.actor).toBe(actor);
      expect(dialog.actionsList).toEqual(existingActions);
    });
  });

  describe("Data Processing", () => {
    test("should categorize actions by type via _prepareContext", async () => {
      const actor = createTestActor();

      const existingActions = [
        {
          id: "action1",
          name: "Action 1",
          actionType: ACTION_TYPES.ACTION,
          img: "icons/svg/sword.svg",
        },
        {
          id: "bonus1",
          name: "Bonus 1",
          actionType: ACTION_TYPES.BONUS_ACTION,
          img: "icons/svg/dagger.svg",
        },
        {
          id: "reaction1",
          name: "Reaction 1",
          actionType: ACTION_TYPES.REACTION,
          img: "icons/svg/shield.svg",
        },
      ];
      actor._flags["actions-tab-5e.actions"] = existingActions;

      const dialog = new ActionsConfig({ actor });

      // ApplicationV2: _prepareContext instead of getData
      const data = await dialog._prepareContext({});

      expect(data.actionsByType[ACTION_TYPES.ACTION].length).toBe(1);
      expect(data.actionsByType[ACTION_TYPES.BONUS_ACTION].length).toBe(1);
      expect(data.actionsByType[ACTION_TYPES.REACTION].length).toBe(1);
      expect(data.actionsByType[ACTION_TYPES.SPECIAL].length).toBe(0);

      expect(data.actionsByType[ACTION_TYPES.ACTION][0].name).toBe("Action 1");
      expect(data.actionsByType[ACTION_TYPES.BONUS_ACTION][0].name).toBe(
        "Bonus 1"
      );
      expect(data.actionsByType[ACTION_TYPES.REACTION][0].name).toBe(
        "Reaction 1"
      );
    });

    test("should filter available items correctly", async () => {
      const actor = createTestActor([
        { name: "Test Sword", type: "weapon", activationType: "action" },
        { name: "Test Class", type: "class" },
        { name: "Test Race", type: "race" },
        { name: "Test Spell", type: "spell", activationType: "bonus" },
        { name: "Test Feature", type: "feat", activationType: "reaction" },
      ]);

      const dialog = new ActionsConfig({ actor });
      const data = await dialog._prepareContext({});

      // class and race should be excluded
      expect(data.availableItems.length).toBe(3);
      expect(
        data.availableItems.some((i) => i.name === "Test Class")
      ).toBeFalsy();
      expect(
        data.availableItems.some((i) => i.name === "Test Race")
      ).toBeFalsy();

      expect(
        data.availableItems.some((i) => i.name === "Test Sword")
      ).toBeTruthy();
      expect(
        data.availableItems.some((i) => i.name === "Test Spell")
      ).toBeTruthy();
      expect(
        data.availableItems.some((i) => i.name === "Test Feature")
      ).toBeTruthy();
    });
  });

  describe("Action Management", () => {
    test("should add items to actions via static action handler", () => {
      const actor = createTestActor([
        { name: "Test Sword", type: "weapon", activationType: "action" },
      ]);

      const itemId = actor.items.values().next().value.id;
      const dialog = new ActionsConfig({ actor });

      // ApplicationV2 action handlers receive (event, target) and `this` is the app
      const event = new Event("click");
      const target = {
        closest: jest.fn().mockReturnValue({
          dataset: { itemId },
        }),
      };

      // Call the static handler bound to the dialog instance
      ActionsConfig._onAddItem.call(dialog, event, target);

      expect(dialog.actionsList.length).toBe(1);
      expect(dialog.actionsList[0].id).toBe(itemId);
      expect(dialog.actionsList[0].name).toBe("Test Sword");
      expect(dialog.actionsList[0].actionType).toBe(ACTION_TYPES.ACTION);
    });

    test("should remove actions via static action handler", () => {
      const actor = createTestActor();
      const dialog = new ActionsConfig({ actor });
      dialog.actionsList = [
        { id: "action1", name: "Action 1", actionType: ACTION_TYPES.ACTION },
        { id: "action2", name: "Action 2", actionType: ACTION_TYPES.ACTION },
      ];

      const event = new Event("click");
      const target = {
        closest: jest.fn().mockReturnValue({
          dataset: { actionId: "action1" },
        }),
      };

      ActionsConfig._onRemoveAction.call(dialog, event, target);

      expect(dialog.actionsList.length).toBe(1);
      expect(dialog.actionsList[0].id).toBe("action2");
    });

    test("should update actor on form submission via formHandler", async () => {
      const actor = createTestActor();
      const setFlagSpy = jest.spyOn(actor, "setFlag");

      const dialog = new ActionsConfig({ actor });
      dialog.actionsList = [
        { id: "action1", name: "Action 1", actionType: ACTION_TYPES.ACTION },
      ];

      // formHandler is static, called with `this` as the app instance
      await ActionsConfig.formHandler.call(dialog, {}, null, {});

      expect(setFlagSpy).toHaveBeenCalledWith(
        "actions-tab-5e",
        "actions",
        dialog.actionsList
      );
    });
  });
});
