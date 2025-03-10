import { registerSettings } from '../../src/module/scripts/settings';
import { MODULE_ID, MODULE_ABBREV, MySettings } from '../../src/module/scripts/constants';

// Mock the helpers module
jest.mock('../../src/module/scripts/helpers', () => ({
  getGame: jest.fn(),
}));

describe('settings.js', () => {
  let registerMock;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create a mock register function
    registerMock = jest.fn();

    // Setup the getGame mock to return an object with settings.register
    const mockHelpers = require('../../src/module/scripts/helpers');
    mockHelpers.getGame.mockReturnValue({
      settings: {
        register: registerMock,
      },
    });
  });

  describe('registerSettings', () => {
    test('registers all module settings', () => {
      // Call function under test
      registerSettings();

      // Check that all settings were registered
      expect(registerMock).toHaveBeenCalledTimes(8);

      // Check module version registration
      expect(registerMock).toHaveBeenCalledWith(
        MODULE_ID,
        MySettings.moduleVersion,
        expect.objectContaining({
          name: 'Module Version',
          scope: 'world',
          config: false,
          type: String,
          default: '0.0.0',
        })
      );

      // Check limitActionsToCantrips registration
      expect(registerMock).toHaveBeenCalledWith(
        MODULE_ID,
        MySettings.limitActionsToCantrips,
        expect.objectContaining({
          name: `${MODULE_ABBREV}.settings.limitActionsToCantrips.Label`,
          default: false,
          type: Boolean,
          scope: 'client',
          config: true,
          hint: `${MODULE_ABBREV}.settings.limitActionsToCantrips.Hint`,
        })
      );

      // Check includeOneMinuteSpells registration
      expect(registerMock).toHaveBeenCalledWith(
        MODULE_ID,
        MySettings.includeOneMinuteSpells,
        expect.objectContaining({
          name: `${MODULE_ABBREV}.settings.includeOneMinuteSpells.Label`,
          default: true,
          type: Boolean,
          scope: 'client',
          config: true,
          hint: `${MODULE_ABBREV}.settings.includeOneMinuteSpells.Hint`,
        })
      );

      // Check includeSpellsWithEffects registration
      expect(registerMock).toHaveBeenCalledWith(
        MODULE_ID,
        MySettings.includeSpellsWithEffects,
        expect.objectContaining({
          name: `${MODULE_ABBREV}.settings.includeSpellsWithEffects.Label`,
          default: true,
          type: Boolean,
          scope: 'client',
          config: true,
          hint: `${MODULE_ABBREV}.settings.includeSpellsWithEffects.Hint`,
        })
      );

      // Check includeConsumables registration
      expect(registerMock).toHaveBeenCalledWith(
        MODULE_ID,
        MySettings.includeConsumables,
        expect.objectContaining({
          name: `${MODULE_ABBREV}.settings.includeConsumables.Label`,
          default: true,
          type: Boolean,
          scope: 'client',
          config: true,
          hint: `${MODULE_ABBREV}.settings.includeConsumables.Hint`,
        })
      );

      // Check injectCharacters registration
      expect(registerMock).toHaveBeenCalledWith(
        MODULE_ID,
        MySettings.injectCharacters,
        expect.objectContaining({
          name: `${MODULE_ABBREV}.settings.injectCharacters.Label`,
          default: true,
          type: Boolean,
          scope: 'client',
          config: true,
          hint: `${MODULE_ABBREV}.settings.injectCharacters.Hint`,
        })
      );

      // Check injectNPCs registration
      expect(registerMock).toHaveBeenCalledWith(
        MODULE_ID,
        MySettings.injectNPCs,
        expect.objectContaining({
          name: `${MODULE_ABBREV}.settings.injectNPCs.Label`,
          default: true,
          type: Boolean,
          scope: 'world',
          config: true,
          hint: `${MODULE_ABBREV}.settings.injectNPCs.Hint`,
        })
      );

      // Check injectVehicles registration
      expect(registerMock).toHaveBeenCalledWith(
        MODULE_ID,
        MySettings.injectVehicles,
        expect.objectContaining({
          name: `${MODULE_ABBREV}.settings.injectVehicles.Label`,
          default: true,
          type: Boolean,
          scope: 'world',
          config: true,
          hint: `${MODULE_ABBREV}.settings.injectVehicles.Hint`,
        })
      );
    });
  });
});
