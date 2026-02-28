/**
 * Actions Tab for D&D 5e
 * A module that adds an Actions tab to the D&D 5e character sheet
 * Compatible with Foundry v13 / dnd5e v5.x
 */

// Constants
export const MODULE_ID = "actions-tab-5e";
export const ACTION_TYPES = {
  ACTION: "action",
  BONUS_ACTION: "bonus",
  REACTION: "reaction",
  SPECIAL: "special",
};

// Import the configuration dialog
import { ActionsConfig } from "./actions-config.js";

/**
 * Main module class
 */
export class ActionsTab {
  static init() {
    this.registerSettings();
    this.registerHooks();
  }

  /**
   * Register module settings
   */
  static registerSettings() {
    game.settings.register(MODULE_ID, "autoPopulate", {
      name: "ACTIONSTAB.Settings.AutoPopulate.Name",
      hint: "ACTIONSTAB.Settings.AutoPopulate.Hint",
      scope: "client",
      config: true,
      default: true,
      type: Boolean,
    });

    game.settings.register(MODULE_ID, "displayCategories", {
      name: "ACTIONSTAB.Settings.DisplayCategories.Name",
      hint: "ACTIONSTAB.Settings.DisplayCategories.Hint",
      scope: "client",
      config: true,
      default: Object.values(ACTION_TYPES),
      type: Array,
    });
  }

  /**
   * Register hooks for the module
   */
  static registerHooks() {
    // dnd5e v5.x uses ApplicationV2-based CharacterActorSheet
    Hooks.on(
      "renderCharacterActorSheet",
      this._onRenderCharacterSheet.bind(this)
    );

    Hooks.on("createItem", this._onItemChange.bind(this));
    Hooks.on("updateItem", this._onItemChange.bind(this));
    Hooks.on("deleteItem", this._onItemDelete.bind(this));
  }

  /**
   * Handle rendering of the character sheet
   * @param {ApplicationV2} app - The character sheet application
   * @param {HTMLElement} element - The sheet's root HTML element
   * @param {object} context - The render context data
   * @param {object} options - Render options
   */
  static _onRenderCharacterSheet(app, element, context, options) {
    if (app.actor.type !== "character") return;
    this._addActionsTab(app, element);
  }

  /**
   * Add the Actions tab to the character sheet
   * @param {ApplicationV2} app - The character sheet application
   * @param {HTMLElement} element - The sheet's root HTML element
   */
  static _addActionsTab(app, element) {
    // Find the tab navigation
    const tabNav = element.querySelector('.tabs[data-group="primary"]');
    if (!tabNav) return;

    // Don't add if already present
    if (tabNav.querySelector('[data-tab="actions"]')) return;

    // Create the new tab button (ApplicationV2 style)
    const tabButton = document.createElement("button");
    tabButton.type = "button";
    tabButton.dataset.tab = "actions";
    tabButton.dataset.group = "primary";
    tabButton.dataset.action = "tab";
    tabButton.textContent = game.i18n.localize("ACTIONSTAB.TabName");
    tabNav.appendChild(tabButton);

    // Create the tab content
    const actionsContent = this._createActionsTabContent(app.actor);

    // Find the sheet body and append
    const sheetBody = element.querySelector(".sheet-body");
    if (sheetBody) {
      sheetBody.appendChild(actionsContent);
    }

    // Add event listeners
    this._addActionsTabListeners(element, app);
  }

  /**
   * Create the content for the Actions tab
   * @param {Actor5e} actor - The actor
   * @returns {HTMLElement} The tab content element
   */
  static _createActionsTabContent(actor) {
    const actions = this._getActionsForActor(actor);

    const content = document.createElement("div");
    content.className = "tab actions";
    content.dataset.group = "primary";
    content.dataset.tab = "actions";

    // Header with configure button
    const header = document.createElement("div");
    header.className = "actions-header";
    header.innerHTML = `
      <h3>${game.i18n.localize("ACTIONSTAB.TabName")}</h3>
      <button class="configure-actions" type="button">
        <i class="fas fa-cog"></i> ${game.i18n.localize("ACTIONSTAB.Configure")}
      </button>
    `;
    content.appendChild(header);

    // Filter by display categories
    const displayCategories = game.settings.get(MODULE_ID, "displayCategories");

    // Create sections for each action type
    for (const category of displayCategories) {
      const categoryActions = actions.filter((a) => a.actionType === category);
      if (!categoryActions.length) continue;

      const categoryName = game.i18n.localize(
        `ACTIONSTAB.ActionType.${category.capitalize()}`
      );

      const section = document.createElement("div");
      section.className = "actions-category";
      section.dataset.category = category;

      let actionsHtml = "";
      for (const action of categoryActions) {
        actionsHtml += `
          <div class="action-item" data-action-id="${action.id}">
            <img class="action-image" src="${action.img}" title="${action.name}">
            <div class="action-name">${action.name}</div>
            <div class="action-controls">
              <a class="action-control action-roll"><i class="fas fa-dice-d20"></i></a>
              <a class="action-control action-info"><i class="fas fa-info-circle"></i></a>
            </div>
          </div>
        `;
      }

      section.innerHTML = `
        <h4>${categoryName}</h4>
        <div class="actions-list">${actionsHtml}</div>
      `;
      content.appendChild(section);
    }

    // Empty state
    if (!actions.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "actions-empty";
      emptyState.innerHTML = `<p>${game.i18n.localize("ACTIONSTAB.EmptyState")}</p>`;
      content.appendChild(emptyState);
    }

    return content;
  }

  /**
   * Get the actions for an actor
   * @param {Actor5e} actor - The actor
   * @returns {Array} Array of action objects
   */
  static _getActionsForActor(actor) {
    const actionsFlag = actor.getFlag(MODULE_ID, "actions") || [];

    if (game.settings.get(MODULE_ID, "autoPopulate")) {
      return this._autoPopulateActions(actor, actionsFlag);
    }

    return actionsFlag;
  }

  /**
   * Auto-populate actions from actor items using the activities API (dnd5e v5.x)
   * @param {Actor5e} actor - The actor
   * @param {Array} existingActions - Any existing actions from flags
   * @returns {Array} The combined actions
   */
  static _autoPopulateActions(actor, existingActions) {
    const actions = [...existingActions];
    const existingById = new Map(existingActions.map((a) => [a.id, a]));

    actor.items.forEach((item) => {
      // dnd5e v5.x: items have activities instead of activation
      if (!item.system.activities || item.system.activities.size === 0) return;

      // Determine the action type from the first matching activity
      let actionType;
      for (const activity of item.system.activities) {
        const activationType = activity.activation?.type;

        switch (activationType) {
          case "action":
            actionType = ACTION_TYPES.ACTION;
            break;
          case "bonus":
            actionType = ACTION_TYPES.BONUS_ACTION;
            break;
          case "reaction":
            actionType = ACTION_TYPES.REACTION;
            break;
          case "special":
            actionType = ACTION_TYPES.SPECIAL;
            break;
          default:
            continue;
        }
        break;
      }

      if (!actionType) return;

      // If the item already exists in the list, update it in place
      const existing = existingById.get(item.id);
      if (existing) {
        existing.actionType = actionType;
        existing.name = item.name;
        existing.img = item.img;
        return;
      }

      // Otherwise add a new entry with minimal data
      actions.push({
        id: item.id,
        name: item.name,
        img: item.img,
        actionType: actionType,
        type: item.type,
      });
    });

    return actions;
  }

  /**
   * Add event listeners for the actions tab
   * @param {HTMLElement} element - The sheet HTML element
   * @param {ApplicationV2} app - The character sheet application
   */
  static _addActionsTabListeners(element, app) {
    // Configure actions button
    const configBtn = element.querySelector(".configure-actions");
    if (configBtn) {
      configBtn.addEventListener(
        "click",
        this._onConfigureActions.bind(this, app)
      );
    }

    // Action roll buttons
    element.querySelectorAll(".action-roll").forEach((btn) => {
      btn.addEventListener("click", this._onActionRoll.bind(this, app));
    });

    // Action info buttons
    element.querySelectorAll(".action-info").forEach((btn) => {
      btn.addEventListener("click", this._onActionInfo.bind(this, app));
    });
  }

  /**
   * Handle configuring actions
   * @param {ApplicationV2} app - The character sheet application
   * @param {Event} event - The click event
   */
  static _onConfigureActions(app, event) {
    event.preventDefault();
    new ActionsConfig({ actor: app.actor }).render({ force: true });
  }

  /**
   * Handle rolling an action
   * @param {ApplicationV2} app - The character sheet application
   * @param {Event} event - The click event
   */
  static _onActionRoll(app, event) {
    event.preventDefault();

    const actionItem = event.currentTarget.closest(".action-item");
    const actionId = actionItem.dataset.actionId;

    const item = app.actor.items.get(actionId);
    if (!item) return;

    item.use();
  }

  /**
   * Handle showing information about an action
   * @param {ApplicationV2} app - The character sheet application
   * @param {Event} event - The click event
   */
  static _onActionInfo(app, event) {
    event.preventDefault();

    const actionItem = event.currentTarget.closest(".action-item");
    const actionId = actionItem.dataset.actionId;

    const item = app.actor.items.get(actionId);
    if (!item) return;

    item.sheet.render(true);
  }

  /**
   * Handle item changes
   * @param {Item5e} item - The item that changed
   */
  static _onItemChange(item) {
    if (!item.parent || item.parent.type !== "character") return;

    if (game.settings.get(MODULE_ID, "autoPopulate")) {
      this._updateActionsForActor(item.parent);
    }
  }

  /**
   * Handle item deletion
   * @param {Item5e} item - The item that was deleted
   */
  static _onItemDelete(item) {
    if (!item.parent || item.parent.type !== "character") return;

    const actions = item.parent.getFlag(MODULE_ID, "actions") || [];
    const updatedActions = actions.filter((a) => a.id !== item.id);

    if (actions.length !== updatedActions.length) {
      item.parent.setFlag(MODULE_ID, "actions", updatedActions);
    }
  }

  /**
   * Update the actions for an actor
   * @param {Actor5e} actor - The actor to update actions for
   */
  static _updateActionsForActor(actor) {
    const currentActions = actor.getFlag(MODULE_ID, "actions") || [];
    const updatedActions = this._autoPopulateActions(actor, currentActions);
    actor.setFlag(MODULE_ID, "actions", updatedActions);
  }
}

/* ------------------------------------ */
/* Initialize module                    */
/* ------------------------------------ */
Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Actions Tab for D&D 5e`);
  ActionsTab.init();
});

// Expose for macro use
window.ActionsTab = {
  getActionsForActor: ActionsTab._getActionsForActor.bind(ActionsTab),
  updateActionsForActor: ActionsTab._updateActionsForActor.bind(ActionsTab),
};
