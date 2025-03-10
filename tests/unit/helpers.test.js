import { getActivationType, isActiveItem, log } from '../../src/module/scripts/helpers';
import { MODULE_ID } from '../../src/module/scripts/constants';

// Mock the global game object
global.game = {
  modules: {
    get: jest.fn(() => ({
      api: {
        getPackageDebugValue: jest.fn(() => true),
      },
    })),
  },
};

// Mock console.log
console.log = jest.fn();

describe('helpers.js', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('getActivationType', () => {
    test('returns the activation type as-is for known types', () => {
      const knownTypes = ['action', 'bonus', 'crew', 'lair', 'legendary', 'reaction'];

      knownTypes.forEach((type) => {
        expect(getActivationType(type)).toBe(type);
      });
    });

    test('returns "other" for unknown activation types', () => {
      const unknownTypes = ['special', 'minute', 'hour', 'day', 'unknown', undefined, null];

      unknownTypes.forEach((type) => {
        expect(getActivationType(type)).toBe('other');
      });
    });
  });

  describe('isActiveItem', () => {
    test('returns false for undefined activation type', () => {
      expect(isActiveItem(undefined)).toBe(false);
      expect(isActiveItem(null)).toBe(false);
      expect(isActiveItem('')).toBe(false);
    });

    test('returns false for excluded activation types', () => {
      const excludedTypes = ['minute', 'hour', 'day', 'none'];

      excludedTypes.forEach((type) => {
        expect(isActiveItem(type)).toBe(false);
      });
    });

    test('returns true for valid activation types', () => {
      const validTypes = ['action', 'bonus', 'reaction', 'legendary', 'lair', 'crew', 'special'];

      validTypes.forEach((type) => {
        expect(isActiveItem(type)).toBe(true);
      });
    });
  });

  describe('log', () => {
    test('logs message when force is true', () => {
      log(true, 'Test message', { data: 'test' });

      expect(console.log).toHaveBeenCalledWith(MODULE_ID, '|', 'Test message', { data: 'test' });
    });

    test('logs message when debug mode is enabled', () => {
      // Mock dev-mode module to return true for debug value
      global.game.modules.get.mockReturnValue({
        api: {
          getPackageDebugValue: jest.fn(() => true),
        },
      });

      log(false, 'Debug message', { debug: true });

      expect(console.log).toHaveBeenCalledWith(MODULE_ID, '|', 'Debug message', { debug: true });
    });

    test('does not log when force is false and debug mode is disabled', () => {
      // Mock dev-mode module to return false for debug value
      global.game.modules.get.mockReturnValue({
        api: {
          getPackageDebugValue: jest.fn(() => false),
        },
      });

      log(false, 'Should not log');

      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('getGame', () => {
    // We'll test the getGame function indirectly through the log function
    // since it's already using getGame() internally
    test('getGame is used by log function', () => {
      // Mock the game object to have modules.get
      global.game = {
        modules: {
          get: jest.fn(() => ({
            api: {
              getPackageDebugValue: jest.fn(() => true),
            },
          })),
        },
      };

      // Make game an instance of Game
      global.Game = function () {};
      Object.setPrototypeOf(global.game, global.Game.prototype);

      // Call log which uses getGame internally
      log(false, 'Testing getGame indirectly');

      // Verify that modules.get was called, which means getGame worked
      expect(global.game.modules.get).toHaveBeenCalledWith('_dev-mode');
    });
  });
});
