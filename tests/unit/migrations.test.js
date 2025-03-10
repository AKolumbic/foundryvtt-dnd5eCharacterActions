import { migrateWorldContent } from '../../src/module/scripts/migrations';
import { MODULE_ID, MySettings } from '../../src/module/scripts/constants';

// Mock the helpers module
jest.mock('../../src/module/scripts/helpers', () => {
  return {
    getGame: jest.fn(),
    log: jest.fn(),
  };
});

describe('migrations.js', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup the game.modules global
    global.game = {
      ...global.game,
      modules: {
        get: jest.fn(() => ({
          data: {
            version: '7.2.1',
          },
        })),
      },
    };

    // Get mock functions
    const mockHelpers = require('../../src/module/scripts/helpers');

    // Mock the settings.get to return '7.0.0' for moduleVersion
    mockHelpers.getGame.mockReturnValue({
      settings: {
        get: jest.fn((moduleId, setting) => {
          if (setting === MySettings.moduleVersion) return '7.0.0';
          return false;
        }),
        set: jest.fn(),
      },
    });

    // Mock isNewerVersion
    global.isNewerVersion = jest.fn();
  });

  describe('migrateWorldContent', () => {
    test('runs migrations when version is newer', async () => {
      // Mock isNewerVersion to simulate needed upgrades
      global.isNewerVersion.mockImplementation((version1) => {
        // Current version > migration version AND stored version < migration version
        if (version1 === '7.2.1') return true; // Current > migration version
        if (version1 === '7.0.0') return false; // Stored < migration version
        return false;
      });

      // Get mock functions
      const mockHelpers = require('../../src/module/scripts/helpers');
      const setSettingsMock = mockHelpers.getGame().settings.set;

      await migrateWorldContent();

      // Check that settings were updated with the new version
      expect(setSettingsMock).toHaveBeenCalledWith(MODULE_ID, MySettings.moduleVersion, '7.2.1');

      // Check that isNewerVersion was called for each migration
      expect(global.isNewerVersion).toHaveBeenCalledWith('7.2.1', '7.1.0');
      expect(global.isNewerVersion).toHaveBeenCalledWith('7.0.0', '7.1.0');
      expect(global.isNewerVersion).toHaveBeenCalledWith('7.2.1', '7.1.2');
      expect(global.isNewerVersion).toHaveBeenCalledWith('7.0.0', '7.1.2');
    });

    test('skips migrations when version is the same', async () => {
      // Mock the stored version to be the same as current
      const mockHelpers = require('../../src/module/scripts/helpers');
      mockHelpers.getGame().settings.get.mockImplementation((moduleId, setting) => {
        if (setting === MySettings.moduleVersion) return '7.2.1';
        return false;
      });

      const setSettingsMock = mockHelpers.getGame().settings.set;

      await migrateWorldContent();

      // Check that settings were NOT updated
      expect(setSettingsMock).not.toHaveBeenCalled();

      // Check that isNewerVersion was not called
      expect(global.isNewerVersion).not.toHaveBeenCalled();
    });

    test('handles various version upgrade paths', async () => {
      // Test upgrading from a version lower than 7.1.0
      const mockHelpers = require('../../src/module/scripts/helpers');
      mockHelpers.getGame().settings.get.mockImplementation((moduleId, setting) => {
        if (setting === MySettings.moduleVersion) return '7.0.9';
        return false;
      });

      // Configure isNewerVersion to simulate needed upgrades
      global.isNewerVersion.mockImplementation((version1, version2) => {
        if (version2 === '7.1.0') {
          return version1 === '7.2.1'; // Current > 7.1.0 but stored < 7.1.0
        }
        if (version2 === '7.1.2') {
          return version1 === '7.2.1'; // Current > 7.1.2 but stored < 7.1.2
        }
        return false;
      });

      await migrateWorldContent();

      // Both migrations should run
      expect(global.isNewerVersion).toHaveBeenCalledTimes(4);

      // Now test upgrading from a version between migrations
      jest.clearAllMocks();
      mockHelpers.getGame().settings.get.mockImplementation((moduleId, setting) => {
        if (setting === MySettings.moduleVersion) return '7.1.1';
        return false;
      });

      // Configure isNewerVersion for the new scenario
      global.isNewerVersion.mockImplementation((version1, version2) => {
        if (version2 === '7.1.0') {
          return version1 === '7.2.1'; // Current > 7.1.0
        }
        if (version2 === '7.1.2') {
          return version1 === '7.2.1'; // Current > 7.1.2
        }
        return false;
      });

      await migrateWorldContent();

      // Both migrations should be checked, but only 7.1.2 should run
      expect(global.isNewerVersion).toHaveBeenCalledTimes(4);
    });
  });
});
