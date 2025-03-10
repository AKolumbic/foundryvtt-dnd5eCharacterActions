import { getActivationType, isActiveItem, log, getGame } from '../../src/module/scripts/helpers';
import { MODULE_ID } from '../../src/module/scripts/constants';

describe('helpers.js', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock the Game class
    global.Game = class Game {};

    // Mock console methods
    global.console = {
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };

    // Mock game object with dev-mode module
    global.game = new global.Game();
    global.game.modules = {
      get: jest.fn(() => ({
        api: {
          getPackageDebugValue: jest.fn(() => true),
        },
      })),
    };
  });

  describe('getGame', () => {
    test('returns game object when initialized', () => {
      // Mock global game object as instance of Game
      global.game = new global.Game();
      global.game.i18n = {
        localize: jest.fn(),
      };

      const result = getGame();
      expect(result).toBe(global.game);
    });

    // TEST FOR LINES 35-38: Testing error case when game is not initialized
    test('throws error when game is not initialized', () => {
      // Remove global game object
      global.game = undefined;

      // Verify that calling getGame throws an error
      expect(() => getGame()).toThrow('game is not initialized yet!');

      // Set game to non-Game instance
      global.game = { notAGame: true };

      // Verify that calling getGame throws an error
      expect(() => getGame()).toThrow('game is not initialized yet!');
    });
  });

  describe('log', () => {
    test('logs debug message when force is false', () => {
      log(false, 'test message', { data: 'test' });
      expect(console.log).toHaveBeenCalledWith(MODULE_ID, '|', 'test message', { data: 'test' });
    });

    test('logs error message when force is true', () => {
      log(true, 'test error', new Error('test'));
      expect(console.log).toHaveBeenCalledWith(MODULE_ID, '|', 'test error', expect.any(Error));
    });

    test('handles multiple arguments', () => {
      log(false, 'message', 'arg1', 'arg2', { data: 'test' });
      expect(console.log).toHaveBeenCalledWith(MODULE_ID, '|', 'message', 'arg1', 'arg2', { data: 'test' });
    });

    test('respects dev-mode debug setting', () => {
      // Mock dev-mode module to return false for debug value
      global.game.modules.get.mockReturnValue({
        api: {
          getPackageDebugValue: jest.fn(() => false),
        },
      });

      // This should not log because force is false and debug mode is off
      log(false, 'should not log');
      expect(console.log).not.toHaveBeenCalled();

      // This should log because force is true, regardless of debug mode
      log(true, 'should log');
      expect(console.log).toHaveBeenCalledWith(MODULE_ID, '|', 'should log');
    });
  });

  describe('isActiveItem', () => {
    test('returns true for valid activation types', () => {
      expect(isActiveItem('action')).toBe(true);
      expect(isActiveItem('bonus')).toBe(true);
      expect(isActiveItem('reaction')).toBe(true);
      expect(isActiveItem('legendary')).toBe(true);
      expect(isActiveItem('lair')).toBe(true);
      expect(isActiveItem('crew')).toBe(true);
    });

    test('returns false for invalid activation types', () => {
      expect(isActiveItem('minute')).toBe(false);
      expect(isActiveItem('hour')).toBe(false);
      expect(isActiveItem('day')).toBe(false);
      expect(isActiveItem('none')).toBe(false);
      expect(isActiveItem(undefined)).toBe(false);
      expect(isActiveItem(null)).toBe(false);
      expect(isActiveItem('')).toBe(false);
    });
  });

  describe('getActivationType', () => {
    test('returns correct type for valid activation types', () => {
      expect(getActivationType('action')).toBe('action');
      expect(getActivationType('bonus')).toBe('bonus');
      expect(getActivationType('reaction')).toBe('reaction');
      expect(getActivationType('legendary')).toBe('legendary');
      expect(getActivationType('lair')).toBe('lair');
      expect(getActivationType('crew')).toBe('crew');
    });

    test('returns "other" for invalid activation types', () => {
      expect(getActivationType('minute')).toBe('other');
      expect(getActivationType('hour')).toBe('other');
      expect(getActivationType('day')).toBe('other');
      expect(getActivationType('none')).toBe('other');
      expect(getActivationType(undefined)).toBe('other');
      expect(getActivationType(null)).toBe('other');
      expect(getActivationType('')).toBe('other');
    });
  });
});
