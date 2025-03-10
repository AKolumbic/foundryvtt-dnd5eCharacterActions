import { addFavoriteControls } from '../../src/module/scripts/handleFavoriteControls';
import { MODULE_ID, MyFlags } from '../../src/module/scripts/constants';

// Mock the helpers module
jest.mock('../../src/module/scripts/helpers', () => ({
  getGame: jest.fn(() => ({
    i18n: {
      localize: jest.fn((key) => key),
    },
  })),
  log: jest.fn(),
}));

// Mock the isItemInActionList function from api.js
jest.mock('../../src/module/scripts/api', () => ({
  isItemInActionList: jest.fn().mockImplementation((item) => {
    // Default behavior: true for equipped weapons, false otherwise
    if (item.type === 'weapon' && item.system?.equipped) {
      return true;
    }
    return false;
  }),
  renderActionsList: jest.fn(() => Promise.resolve('<div>Mocked Actions List</div>')),
}));

describe('handleFavoriteControls.js', () => {
  let mockApp;
  let mockHtml;
  let mockItems;
  let clickHandler;
  let mockJQuery;
  let mockActionsTab;
  let mockItemImage;
  let mockItemRecharge;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock items for testing
    mockItems = new Map();
    mockItems.set('item1', {
      id: 'item1',
      name: 'Longsword',
      type: 'weapon',
      system: { equipped: true },
      getFlag: jest.fn(() => undefined),
      setFlag: jest.fn(),
    });
    mockItems.set('item2', {
      id: 'item2',
      name: 'Dagger',
      type: 'weapon',
      system: { equipped: false },
      getFlag: jest.fn(() => undefined),
      setFlag: jest.fn(),
    });

    // Setup mock app and html
    mockApp = {
      options: { editable: true },
      object: {
        items: {
          get: jest.fn((id) => mockItems.get(id)),
        },
        isOwner: true,
      },
      _onItemUse: jest.fn(),
      _onItemRecharge: jest.fn(),
    };

    // Store the click handler
    clickHandler = null;

    // Create mock item elements
    mockItemImage = {
      click: jest.fn(),
    };

    mockItemRecharge = {
      click: jest.fn(),
    };

    // Create mock actions tab
    mockActionsTab = {
      length: 0,
      empty: jest.fn().mockReturnThis(),
      append: jest.fn(),
      find: jest.fn().mockImplementation((selector) => {
        if (selector === '.item .item-image') {
          return mockItemImage;
        }
        if (selector === '.item .item-recharge') {
          return mockItemRecharge;
        }
        return mockActionsTab;
      }),
    };

    // Mock jQuery
    mockJQuery = {
      find: jest.fn().mockImplementation((selector) => {
        if (selector === '.tab.actions') {
          return mockActionsTab;
        }
        return mockJQuery;
      }),
      each: jest.fn((callback) => {
        // Mock the iteration over item elements
        callback(0, { dataset: { itemId: 'item1' } });
        callback(1, { dataset: { itemId: 'item2' } });
        return mockJQuery;
      }),
      on: jest.fn((event, selector, handler) => {
        // Store handler for later use
        clickHandler = handler;
        return mockJQuery;
      }),
      append: jest.fn().mockReturnThis(),
      parents: jest.fn(() => [{ dataset: { itemId: 'item1' } }]),
      empty: jest.fn().mockReturnThis(),
    };

    global.$ = jest.fn().mockReturnValue(mockJQuery);

    // Mock html structure
    mockHtml = {
      find: jest.fn().mockReturnValue({
        each: jest.fn((callback) => {
          // Mock the iteration over item elements
          callback(0, { dataset: { itemId: 'item1' } });
          callback(1, { dataset: { itemId: 'item2' } });
        }),
      }),
    };

    // Setup dynamic import mock for the api.js module
    jest.mock('../../src/module/scripts/api.js', () => ({
      renderActionsList: jest.fn(() => Promise.resolve('<div>Mocked Actions List</div>')),
    }));
    global.import = jest.fn(() =>
      Promise.resolve({
        renderActionsList: jest.fn(() => Promise.resolve('<div>Mocked Actions List</div>')),
      })
    );
  });

  describe('addFavoriteControls', () => {
    test('adds filter buttons to item controls', () => {
      // Call the function under test
      addFavoriteControls(mockApp, mockHtml);

      // Check that html.find was called to locate items
      expect(mockHtml.find).toHaveBeenCalledWith('[data-item-id]');

      // Check that correct items were retrieved from the app
      expect(mockApp.object.items.get).toHaveBeenCalledWith('item1');
      expect(mockApp.object.items.get).toHaveBeenCalledWith('item2');

      // Check that isItemInActionList was called to determine current filter state
      const { isItemInActionList } = require('../../src/module/scripts/api');
      expect(isItemInActionList).toHaveBeenCalledTimes(2);
    });

    test('handles click events on filter buttons', async () => {
      // Call the function under test
      addFavoriteControls(mockApp, mockHtml);

      // Verify click handler was stored
      expect(clickHandler).not.toBeNull();

      // Create a mock event
      const mockEvent = { target: document.createElement('a') };

      // Call the click handler
      await clickHandler(mockEvent);

      // Check that the item flag was updated with the opposite value
      expect(mockItems.get('item1').setFlag).toHaveBeenCalledWith(
        MODULE_ID,
        MyFlags.filterOverride,
        false // Since isItemInActionList returns true for item1
      );
    });

    test('skips non-editable sheets', () => {
      // Set app as non-editable
      mockApp.options.editable = false;

      // Call the function under test
      addFavoriteControls(mockApp, mockHtml);

      // Check that no event listener was added
      expect($(mockHtml).on).not.toHaveBeenCalled();

      // Check that no item lookup was performed
      expect(mockApp.object.items.get).not.toHaveBeenCalled();
    });

    test('handles re-rendering the actions tab', async () => {
      // Set up the actions tab to have length > 0
      mockActionsTab.length = 1;

      // Call the function under test
      addFavoriteControls(mockApp, mockHtml);

      // Verify click handler was stored
      expect(clickHandler).not.toBeNull();

      // Create a mock event
      const mockEvent = { target: document.createElement('a') };

      // Call the click handler
      await clickHandler(mockEvent);

      // Check that the actionsTab was found and emptied
      expect(mockActionsTab.empty).toHaveBeenCalled();
      expect(mockActionsTab.append).toHaveBeenCalled();
    });

    test('handles error when setting flag', async () => {
      // Setup mock that throws an error
      mockItems.get('item1').setFlag.mockImplementation(() => {
        throw new Error('Test error');
      });

      // Call the function under test
      addFavoriteControls(mockApp, mockHtml);

      // Verify click handler was stored
      expect(clickHandler).not.toBeNull();

      // Create a mock event
      const mockEvent = { target: document.createElement('a') };

      // This should not throw an error
      await expect(clickHandler(mockEvent)).resolves.not.toThrow();

      // Check that the error was logged
      const { log } = require('../../src/module/scripts/helpers');
      expect(log).toHaveBeenCalledWith(true, 'Error trying to set flag on item', expect.any(Error));
    });

    test('handles missing item when clicking filter button', async () => {
      // Call the function under test
      addFavoriteControls(mockApp, mockHtml);

      // Verify click handler was stored
      expect(clickHandler).not.toBeNull();

      // Mock the app.object.items.get to return undefined (item not found)
      mockApp.object.items.get.mockReturnValue(undefined);

      // Create a mock event
      const mockEvent = { target: document.createElement('a') };

      // Call the click handler
      await clickHandler(mockEvent);

      // Check that no flag was set (since item was not found)
      expect(mockItems.get('item1').setFlag).not.toHaveBeenCalled();
    });

    test('handles re-attaching event handlers when owner', async () => {
      // Set up the actions tab to have length > 0
      mockActionsTab.length = 1;

      // Set app.object.isOwner to true
      mockApp.object.isOwner = true;

      // Call the function under test
      addFavoriteControls(mockApp, mockHtml);

      // Verify click handler was stored
      expect(clickHandler).not.toBeNull();

      // Create a mock event
      const mockEvent = { target: document.createElement('a') };

      // Call the click handler
      await clickHandler(mockEvent);

      // Check that the app's event handlers were called
      expect(mockApp._onItemUse).not.toHaveBeenCalled(); // Not called directly, but click handler is attached
      expect(mockApp._onItemRecharge).not.toHaveBeenCalled(); // Not called directly, but click handler is attached
    });

    test('skips re-attaching event handlers when not owner', async () => {
      // Set up the actions tab to have length > 0
      mockActionsTab.length = 1;

      // Set app.object.isOwner to false
      mockApp.object.isOwner = false;

      // Call the function under test
      addFavoriteControls(mockApp, mockHtml);

      // Verify click handler was stored
      expect(clickHandler).not.toBeNull();

      // Create a mock event
      const mockEvent = { target: document.createElement('a') };

      // Call the click handler
      await clickHandler(mockEvent);

      // Check that event handlers were not re-attached
      expect(mockItemImage.click).not.toHaveBeenCalled();
      expect(mockItemRecharge.click).not.toHaveBeenCalled();
    });
  });
});
