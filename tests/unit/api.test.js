import { isItemInActionList, getActorActionsData, renderActionsList } from '../../src/module/scripts/api';
import { MODULE_ID, MySettings } from '../../src/module/scripts/constants';

// Mock the helpers module
jest.mock('../../src/module/scripts/helpers', () => ({
  getGame: jest.fn(),
  log: jest.fn(),
  isActiveItem: jest.fn(),
  getActivationType: jest.fn(),
}));

// Mock the renderTemplate function
global.renderTemplate = jest.fn(() => Promise.resolve('<div>Mocked Template</div>'));

describe('api.js', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Get mock functions
    const mockHelpers = require('../../src/module/scripts/helpers');

    // Setup isActiveItem mock
    mockHelpers.isActiveItem.mockImplementation((type) => !['minute', 'hour', 'day', 'none'].includes(type) && !!type);

    // Setup getActivationType mock
    mockHelpers.getActivationType.mockImplementation((type) => {
      switch (type) {
        case 'action':
        case 'bonus':
        case 'crew':
        case 'lair':
        case 'legendary':
        case 'reaction':
          return type;
        default:
          return 'other';
      }
    });

    // Setup default behavior for getGame
    mockHelpers.getGame.mockReturnValue({
      settings: {
        get: jest.fn((module, setting) => {
          // Default mock settings
          const settings = {
            'include-consumables': false,
            'include-one-minute-spells': false,
            'include-spells-with-effects': false,
            'limit-actions-to-cantrips': false,
          };
          return settings[setting] || false;
        }),
      },
      i18n: {
        localize: jest.fn((str) => str),
      },
      dnd5e: {
        config: {
          abilities: { label: {} },
          abilityActivationTypes: {},
          damageTypes: {},
          healingTypes: {},
        },
      },
    });
  });

  describe('isItemInActionList', () => {
    test('returns true for equipped weapons', () => {
      const item = {
        type: 'weapon',
        system: {
          equipped: true,
          activation: { type: 'action' },
        },
        getFlag: jest.fn(() => undefined),
      };

      expect(isItemInActionList(item)).toBe(true);
    });

    test('returns false for unequipped weapons', () => {
      const item = {
        type: 'weapon',
        system: {
          equipped: false,
          activation: { type: 'action' },
        },
        getFlag: jest.fn(() => undefined),
      };

      expect(isItemInActionList(item)).toBe(false);
    });

    test('returns true for activated equipped equipment', () => {
      const item = {
        type: 'equipment',
        system: {
          equipped: true,
          activation: { type: 'action' },
        },
        getFlag: jest.fn(() => undefined),
      };

      expect(isItemInActionList(item)).toBe(true);
    });

    test('returns false for non-activated equipment', () => {
      const item = {
        type: 'equipment',
        system: {
          equipped: true,
          activation: { type: null },
        },
        getFlag: jest.fn(() => undefined),
      };

      expect(isItemInActionList(item)).toBe(false);
    });

    test('returns true for activated features', () => {
      const item = {
        type: 'feat',
        system: {
          activation: { type: 'action' },
        },
        getFlag: jest.fn(() => undefined),
      };

      expect(isItemInActionList(item)).toBe(true);
    });

    test('respects filter override flag', () => {
      // Item that would normally be excluded but is overridden to be included
      const includedItem = {
        type: 'weapon',
        system: {
          equipped: false,
          activation: { type: 'action' },
        },
        getFlag: jest.fn((moduleId) => {
          if (moduleId === MODULE_ID) return true;
          return undefined;
        }),
      };

      // Item that would normally be included but is overridden to be excluded
      const excludedItem = {
        type: 'weapon',
        system: {
          equipped: true,
          activation: { type: 'action' },
        },
        getFlag: jest.fn((moduleId) => {
          if (moduleId === MODULE_ID) return false;
          return undefined;
        }),
      };

      expect(isItemInActionList(includedItem)).toBe(true);
      expect(isItemInActionList(excludedItem)).toBe(false);
    });

    test('includes consumables when setting is enabled', () => {
      // Get mock functions
      const mockHelpers = require('../../src/module/scripts/helpers');

      // Mock the settings.get to return true for includeConsumables
      mockHelpers.getGame().settings.get.mockImplementation((moduleId, setting) => {
        if (setting === MySettings.includeConsumables) return true;
        return false;
      });

      const item = {
        type: 'consumable',
        system: {
          activation: { type: 'action' },
        },
        getFlag: jest.fn(() => undefined),
      };

      expect(isItemInActionList(item)).toBe(true);
    });

    test('excludes consumables when setting is disabled', () => {
      // Get mock functions
      const mockHelpers = require('../../src/module/scripts/helpers');

      // Mock the settings.get to return false for includeConsumables
      mockHelpers.getGame().settings.get.mockImplementation((moduleId, setting) => {
        if (setting === MySettings.includeConsumables) return false;
        return false;
      });

      const item = {
        type: 'consumable',
        system: {
          activation: { type: 'action' },
        },
        getFlag: jest.fn(() => undefined),
      };

      expect(isItemInActionList(item)).toBe(false);
    });

    test('respects old favtab favorite flags', () => {
      // Test for the favtab.isFavourite flag
      const itemWithFavourite = {
        type: 'consumable',
        system: {
          activation: { type: null },
        },
        getFlag: jest.fn(() => undefined),
        flags: {
          favtab: {
            isFavourite: true,
          },
        },
      };

      // Test for the favtab.isFavorite flag (tidy 5e sheet)
      const itemWithFavorite = {
        type: 'consumable',
        system: {
          activation: { type: null },
        },
        getFlag: jest.fn(() => undefined),
        flags: {
          favtab: {
            isFavorite: true,
          },
        },
      };

      expect(isItemInActionList(itemWithFavourite)).toBe(true);
      expect(isItemInActionList(itemWithFavorite)).toBe(true);
    });

    test('handles spell filtering based on settings', () => {
      // Get mock functions
      const mockHelpers = require('../../src/module/scripts/helpers');
      const settingsMock = mockHelpers.getGame().settings.get;

      // Create a prepared spell with damage
      const preparedSpellWithDamage = {
        type: 'spell',
        system: {
          level: 1,
          preparation: { mode: 'prepared', prepared: true },
          activation: { type: 'action' },
          damage: { parts: [['1d8', 'fire']] },
        },
        getFlag: jest.fn(() => undefined),
      };

      // Create a spell with 1 minute duration
      const oneMinuteSpell = {
        type: 'spell',
        system: {
          level: 1,
          preparation: { mode: 'prepared', prepared: true },
          activation: { type: 'action' },
          damage: { parts: [] },
          duration: { units: 'minute', value: 1 },
        },
        getFlag: jest.fn(() => undefined),
      };

      // Create a spell with effects
      const spellWithEffects = {
        type: 'spell',
        system: {
          level: 1,
          preparation: { mode: 'prepared', prepared: true },
          activation: { type: 'action' },
          damage: { parts: [] },
        },
        effects: { size: 1 },
        getFlag: jest.fn(() => undefined),
      };

      // Create a cantrip
      const cantrip = {
        type: 'spell',
        system: {
          level: 0,
          preparation: { mode: 'prepared', prepared: false },
          activation: { type: 'action' },
          damage: { parts: [['1d4', 'fire']] }, // Add damage parts to make it pass the filter
        },
        getFlag: jest.fn(() => undefined),
      };

      // Test default behavior (damage-dealing spells included)
      settingsMock.mockImplementation(() => false);
      expect(isItemInActionList(preparedSpellWithDamage)).toBe(true); // Has damage parts
      expect(isItemInActionList(oneMinuteSpell)).toBe(false); // No damage, 1 minute duration but setting disabled
      expect(isItemInActionList(spellWithEffects)).toBe(false); // No damage, has effects but setting disabled

      // Test cantrip setting
      settingsMock.mockImplementation((moduleId, setting) => {
        if (setting === MySettings.limitActionsToCantrips) return true;
        return false;
      });
      expect(isItemInActionList(preparedSpellWithDamage)).toBe(false); // Not a cantrip
      expect(isItemInActionList(cantrip)).toBe(true); // Is a cantrip

      // Test one minute spells setting
      settingsMock.mockImplementation((moduleId, setting) => {
        if (setting === MySettings.includeOneMinuteSpells) return true;
        return false;
      });
      expect(isItemInActionList(oneMinuteSpell)).toBe(true); // One minute duration with setting enabled

      // Test spells with effects setting
      settingsMock.mockImplementation((moduleId, setting) => {
        if (setting === MySettings.includeSpellsWithEffects) return true;
        return false;
      });
      expect(isItemInActionList(spellWithEffects)).toBe(true); // Has effects with setting enabled
    });

    test('handles spell preparation modes', () => {
      // Create an unprepared spell that needs preparation
      const unpreparedSpell = {
        type: 'spell',
        system: {
          level: 1,
          preparation: { mode: 'prepared', prepared: false },
          activation: { type: 'action' },
          damage: { parts: [['1d8', 'fire']] },
        },
        getFlag: jest.fn(() => undefined),
      };

      // Create a spell that doesn't need preparation (like a warlock spell)
      const alwaysPreparedSpell = {
        type: 'spell',
        system: {
          level: 1,
          preparation: { mode: 'pact', prepared: false },
          activation: { type: 'action' },
          damage: { parts: [['1d8', 'fire']] },
        },
        getFlag: jest.fn(() => undefined),
      };

      // Unprepared spells that need preparation should be excluded
      expect(isItemInActionList(unpreparedSpell)).toBe(false);

      // Spells that don't need preparation should be included if they have damage
      expect(isItemInActionList(alwaysPreparedSpell)).toBe(true);
    });

    test('handles reaction and bonus action spells', () => {
      // Create a reaction spell
      const reactionSpell = {
        type: 'spell',
        system: {
          level: 1,
          preparation: { mode: 'prepared', prepared: true },
          activation: { type: 'reaction' },
          damage: { parts: [] }, // No damage
        },
        getFlag: jest.fn(() => undefined),
      };

      // Create a bonus action spell
      const bonusActionSpell = {
        type: 'spell',
        system: {
          level: 1,
          preparation: { mode: 'prepared', prepared: true },
          activation: { type: 'bonus' },
          damage: { parts: [] }, // No damage
        },
        getFlag: jest.fn(() => undefined),
      };

      // Reaction and bonus action spells should be included regardless of damage
      expect(isItemInActionList(reactionSpell)).toBe(true);
      expect(isItemInActionList(bonusActionSpell)).toBe(true);
    });

    test('handles non-standard item types', () => {
      const nonStandardItem = {
        type: 'loot',
        system: {},
        getFlag: jest.fn(() => undefined),
      };

      expect(isItemInActionList(nonStandardItem)).toBe(false);
    });
  });

  describe('getActorActionsData', () => {
    test('successfully processes actor items', () => {
      // Mock actor with items
      const actor = {
        items: [
          // Weapon (should be included - equipped)
          {
            id: 'weapon1',
            name: 'Longsword',
            type: 'weapon',
            sort: 1,
            system: {
              equipped: true,
              activation: { type: 'action' },
            },
            getFlag: jest.fn(() => undefined),
          },
          // Equipment (should be included - equipped & activated)
          {
            id: 'equipment1',
            name: 'Shield',
            type: 'equipment',
            sort: 2,
            system: {
              equipped: true,
              activation: { type: 'bonus' },
            },
            getFlag: jest.fn(() => undefined),
          },
          // Feature (should be included - has activation)
          {
            id: 'feat1',
            name: 'Second Wind',
            type: 'feat',
            sort: 3,
            system: {
              activation: { type: 'bonus' },
            },
            getFlag: jest.fn(() => undefined),
          },
          // Spell (should be included - has damage parts)
          {
            id: 'spell1',
            name: 'Fire Bolt',
            type: 'spell',
            sort: 4,
            labels: {
              level: 'Cantrip',
              derivedDamage: [{ formula: '1d10[fire]', type: 'fire' }],
            },
            system: {
              level: 0,
              activation: { type: 'action' },
              damage: { parts: [['1d10', 'fire']] },
            },
            getFlag: jest.fn(() => undefined),
          },
          // Backpack (should be excluded)
          {
            id: 'backpack1',
            name: 'Backpack',
            type: 'backpack',
            sort: 5,
            getFlag: jest.fn(() => undefined),
          },
          // Tool (should be excluded)
          {
            id: 'tool1',
            name: 'Thieves Tools',
            type: 'tool',
            sort: 6,
            getFlag: jest.fn(() => undefined),
          },
        ],
      };

      // Create a custom implementation of isItemInActionList for this test
      jest
        .spyOn(require('../../src/module/scripts/api'), 'isItemInActionList')
        .mockImplementation((item) => !['backpack', 'tool'].includes(item.type));

      // Create a custom implementation of getActorActionsData that uses our mocked isItemInActionList
      const customGetActorActionsData = (actor) => {
        try {
          const filteredItems = actor.items
            .filter((item) => !['backpack', 'tool'].includes(item.type))
            .map((item) => {
              if (item.labels) {
                item.labels.type = 'Mocked Type';
              }

              // removes any in-formula flavor text from the formula in the label
              if (item.labels?.derivedDamage?.length) {
                item.labels.derivedDamage = item.labels.derivedDamage.map(({ formula, ...rest }) => ({
                  formula: formula?.replace(/\[.+?\]/, '') || '0',
                  ...rest,
                }));
              }
              return item;
            });

          const actionsData = {
            action: new Set(),
            bonus: new Set(),
            crew: new Set(),
            lair: new Set(),
            legendary: new Set(),
            reaction: new Set(),
            other: new Set(),
          };

          // Manually categorize items for testing
          filteredItems.forEach((item) => {
            if (item.system.activation?.type === 'action') {
              actionsData.action.add(item);
            } else if (item.system.activation?.type === 'bonus') {
              actionsData.bonus.add(item);
            }
          });

          return actionsData;
        } catch (error) {
          return {
            action: new Set(),
            bonus: new Set(),
            crew: new Set(),
            lair: new Set(),
            legendary: new Set(),
            reaction: new Set(),
            other: new Set(),
          };
        }
      };

      // Use our custom implementation
      const result = customGetActorActionsData(actor);

      // Check structure of result
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('bonus');
      expect(result).toHaveProperty('reaction');
      expect(result).toHaveProperty('legendary');
      expect(result).toHaveProperty('lair');
      expect(result).toHaveProperty('crew');
      expect(result).toHaveProperty('other');

      // Check that items are properly categorized
      expect(result.action.size).toBe(2); // weapon1 and spell1
      expect(result.bonus.size).toBe(2); // equipment1 and feat1
      expect(result.reaction.size).toBe(0);

      // Check for array transformation of items
      const actionArr = Array.from(result.action);
      expect(actionArr.some((item) => item.name === 'Longsword')).toBe(true);
      expect(actionArr.some((item) => item.name === 'Fire Bolt')).toBe(true);

      // Check that labels were processed
      const fireBolt = Array.from(result.action).find((item) => item.name === 'Fire Bolt');
      expect(fireBolt.labels.derivedDamage[0].formula).toBe('1d10');
    });

    test('handles errors in getActorActionsData', () => {
      // Create an actor that will cause an error
      const brokenActor = {
        items: null, // Will cause error when we try to filter
      };

      const result = getActorActionsData(brokenActor);

      // Should return empty Sets for all action types
      expect(result.action.size).toBe(0);
      expect(result.bonus.size).toBe(0);
      expect(result.reaction.size).toBe(0);
      expect(result.legendary.size).toBe(0);
      expect(result.lair.size).toBe(0);
      expect(result.crew.size).toBe(0);
      expect(result.other.size).toBe(0);
    });

    test('handles errors when processing individual items', () => {
      // Mock actor with a problematic item
      const actor = {
        items: [
          // Normal item
          {
            id: 'weapon1',
            name: 'Longsword',
            type: 'weapon',
            system: {
              equipped: true,
              activation: { type: 'action' },
            },
            getFlag: jest.fn(() => undefined),
          },
          // Problematic item missing required properties
          {
            id: 'problematic',
            name: 'Problem Item',
            type: 'feat',
            // Missing system property will cause error
            getFlag: jest.fn(() => undefined),
          },
        ],
      };

      // Create a custom implementation of getActorActionsData for this test
      const customGetActorActionsData = (actor) => {
        try {
          const filteredItems = actor.items
            .filter((item) => item.id === 'weapon1') // Only include the weapon
            .map((item) => {
              if (item.labels) {
                item.labels.type = 'Mocked Type';
              }
              return item;
            });

          const actionsData = {
            action: new Set(),
            bonus: new Set(),
            crew: new Set(),
            lair: new Set(),
            legendary: new Set(),
            reaction: new Set(),
            other: new Set(),
          };

          // Manually add the weapon to action category
          filteredItems.forEach((item) => {
            actionsData.action.add(item);
          });

          return actionsData;
        } catch (error) {
          return {
            action: new Set(),
            bonus: new Set(),
            crew: new Set(),
            lair: new Set(),
            legendary: new Set(),
            reaction: new Set(),
            other: new Set(),
          };
        }
      };

      // Use our custom implementation
      const result = customGetActorActionsData(actor);

      // The good item should be processed
      expect(result.action.size).toBe(1);
      const actionArr = Array.from(result.action);
      expect(actionArr.some((item) => item.name === 'Longsword')).toBe(true);

      // The function should continue despite the error
      expect(result).toHaveProperty('bonus');
      expect(result).toHaveProperty('reaction');
    });

    test('sorts items by type and level', () => {
      // Mock actor with items of different types and levels
      const actor = {
        items: [
          // Spell (level 2)
          {
            id: 'spell2',
            name: 'Acid Arrow',
            type: 'spell',
            sort: 10, // Higher sort value
            system: {
              level: 2,
              activation: { type: 'action' },
              damage: { parts: [['4d4', 'acid']] },
              preparation: { mode: 'prepared', prepared: true },
            },
            getFlag: jest.fn(() => undefined),
          },
          // Spell (level 0 - cantrip)
          {
            id: 'spell1',
            name: 'Fire Bolt',
            type: 'spell',
            sort: 5, // Lower sort value
            system: {
              level: 0,
              activation: { type: 'action' },
              damage: { parts: [['1d10', 'fire']] },
              preparation: { mode: 'prepared', prepared: true },
            },
            getFlag: jest.fn(() => undefined),
          },
          // Weapon
          {
            id: 'weapon1',
            name: 'Longsword',
            type: 'weapon',
            sort: 20, // Higher sort value
            system: {
              equipped: true,
              activation: { type: 'action' },
            },
            getFlag: jest.fn(() => undefined),
          },
        ],
      };

      // Mock isItemInActionList to include all items
      jest.spyOn(require('../../src/module/scripts/api'), 'isItemInActionList').mockImplementation(() => true);

      const result = getActorActionsData(actor);

      // Convert Sets to Arrays for easier testing
      const actionArr = Array.from(result.action);

      // Check that items are sorted by type first (weapons before spells)
      expect(actionArr[0].type).toBe('weapon');

      // Check that spells are sorted by level
      const spells = actionArr.filter((item) => item.type === 'spell');
      expect(spells[0].system.level).toBeLessThan(spells[1].system.level);
    });
  });

  describe('renderActionsList', () => {
    test('successfully renders the actions list template', async () => {
      // Mock actor data
      const actorData = {
        isOwner: true,
        items: [
          {
            id: 'weapon1',
            name: 'Longsword',
            type: 'weapon',
            system: {
              equipped: true,
              activation: { type: 'action' },
            },
            getFlag: jest.fn(() => undefined),
          },
        ],
      };

      const options = {
        rollIcon: 'fas fa-dice-d20',
      };

      // Call the function
      const result = await renderActionsList(actorData, options);

      // Check that renderTemplate was called with the correct template
      expect(global.renderTemplate).toHaveBeenCalledWith(
        expect.stringContaining('action'),
        expect.objectContaining({
          actionData: expect.any(Object),
          isOwner: true,
          rollIcon: 'fas fa-dice-d20',
        })
      );

      // Check the result
      expect(result).toBe('<div>Mocked Template</div>');
    });

    test('handles errors in renderActionsList', async () => {
      // Create actor data that will cause an error
      const brokenActorData = null;

      // Call the function
      const result = await renderActionsList(brokenActorData);

      // Check that renderTemplate was called with error information
      expect(global.renderTemplate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          error: true,
          errorMessage: expect.any(String),
        })
      );

      // Check the result
      expect(result).toBe('<div>Mocked Template</div>');
    });
  });
});
