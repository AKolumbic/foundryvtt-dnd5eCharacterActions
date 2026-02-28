/**
 * Setup for testing the Actions Tab module
 * Mocks Foundry v13 / dnd5e v5.x APIs
 */

// Mock for window (needed for window.ActionsTab assignment in actions-tab.js)
global.window = global;

// Mock for the game object
global.game = {
  i18n: {
    localize: (key) => key,
    format: (key, data) => key,
  },
  settings: {
    register: jest.fn(),
    get: jest.fn().mockImplementation((moduleId, key) => {
      if (key === "autoPopulate") return true;
      if (key === "displayCategories")
        return ["action", "bonus", "reaction", "special"];
      return null;
    }),
  },
};

// Mock for Hooks
global.Hooks = {
  on: jest.fn(),
  once: jest.fn(),
};

// Mock for foundry global (v13 APIs)
global.foundry = {
  utils: {
    deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
    mergeObject: (original, other) => Object.assign({}, original, other),
  },
  applications: {
    api: {
      ApplicationV2: class ApplicationV2 {
        constructor(options = {}) {
          this.options = options;
        }
        render(options) {
          return this;
        }
        close() {
          return this;
        }
        get element() {
          return document.createElement("div");
        }
      },
      HandlebarsApplicationMixin: (Base) =>
        class extends Base {
          constructor(options = {}) {
            super(options);
          }
          async _prepareContext(options) {
            return {};
          }
          _onRender(context, options) {}
        },
    },
  },
};

// Mock for document global (for vanilla DOM tests)
if (typeof document === "undefined") {
  // Node environment - jsdom is not available, use minimal mock
  global.document = {
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      className: "",
      dataset: {},
      innerHTML: "",
      textContent: "",
      type: "",
      children: [],
      appendChild: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn().mockReturnValue([]),
      setAttribute: jest.fn(),
      addEventListener: jest.fn(),
      closest: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
      },
    }),
  };
}

// Mock Activities Collection (iterable, with size property)
class ActivitiesCollection {
  constructor(activities = []) {
    this._activities = activities;
  }

  get size() {
    return this._activities.length;
  }

  [Symbol.iterator]() {
    return this._activities[Symbol.iterator]();
  }

  forEach(callback) {
    this._activities.forEach(callback);
  }
}

// Mock for Actor
class MockActor {
  constructor(data = {}) {
    this.items = new Collection();
    this.type = data.type || "character";
    this.id = data.id || Math.random().toString(36).substring(2, 15);
    this._flags = {};
  }

  getFlag(moduleId, key) {
    return this._flags[`${moduleId}.${key}`] || null;
  }

  setFlag(moduleId, key, value) {
    this._flags[`${moduleId}.${key}`] = value;
    return Promise.resolve(this);
  }
}

// Mock for Item (dnd5e v5.x with activities)
class MockItem {
  constructor(data = {}) {
    this.id = data.id || Math.random().toString(36).substring(2, 15);
    this.name = data.name || "Test Item";
    this.type = data.type || "weapon";
    this.img = data.img || "icons/svg/sword.svg";
    this.parent = data.parent || null;
    this.sheet = { render: jest.fn() };

    // dnd5e v5.x: activities-based system
    const activationType = data.activationType || "action";
    const activities =
      data.activities !== undefined
        ? data.activities
        : [
            {
              activation: {
                type: activationType,
              },
            },
          ];

    this.system = data.system || {
      activities: new ActivitiesCollection(activities),
    };
  }

  use() {
    return true;
  }
}

// Mock Collection
class Collection extends Map {
  constructor(entries) {
    super(entries);
  }

  get(key) {
    return super.get(key);
  }

  filter(predicate) {
    return Array.from(this.values()).filter(predicate);
  }

  forEach(callback) {
    Array.from(this.values()).forEach(callback);
  }

  find(predicate) {
    return Array.from(this.values()).find(predicate);
  }

  map(callback) {
    return Array.from(this.values()).map(callback);
  }
}

// Utility function to create a test actor with items
function createTestActor(itemsData = []) {
  const actor = new MockActor({ type: "character" });

  itemsData.forEach((itemData) => {
    const item = new MockItem({ ...itemData, parent: actor });
    actor.items.set(item.id, item);
  });

  return actor;
}

// Export mocks and utilities
export {
  MockActor,
  MockItem,
  ActivitiesCollection,
  Collection,
  createTestActor,
};
