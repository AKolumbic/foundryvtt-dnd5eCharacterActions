// Mock Foundry VTT global objects and functions
global.game = {
  actors: {
    find: jest.fn(),
  },
  i18n: {
    localize: jest.fn((key) => key),
  },
  settings: {
    get: jest.fn(),
    register: jest.fn(),
  },
  modules: {
    get: jest.fn(() => ({
      api: {},
    })),
  },
  dnd5e: {
    config: {
      abilities: {
        label: {},
      },
      abilityActivationTypes: {},
      damageTypes: {},
      healingTypes: {},
    },
  },
};

global.Hooks = {
  on: jest.fn(),
  once: jest.fn(),
  call: jest.fn(),
};

global.FormApplication = class FormApplication {
  static get defaultOptions() {
    return {};
  }
};

global.ActorSheet5e = class ActorSheet5e extends FormApplication {};

global.foundry = {
  utils: {
    mergeObject: jest.fn((obj1, obj2) => ({ ...obj1, ...obj2 })),
  },
};

global.renderTemplate = jest.fn(() => '<div>Mocked Template</div>');

global.$ = jest.fn(() => ({
  find: jest.fn(() => ({
    each: jest.fn(),
    append: jest.fn(),
    html: jest.fn(),
    click: jest.fn(),
    remove: jest.fn(),
    empty: jest.fn(),
    length: 0,
  })),
  on: jest.fn(),
  closest: jest.fn(() => ({
    parents: jest.fn(() => [{ dataset: { itemId: 'test-id' } }]),
  })),
}));

// Clear all mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
