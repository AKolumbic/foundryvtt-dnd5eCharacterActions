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

    // Add tab button if not already present
    if (!tabNav.querySelector('[data-tab="actions"]')) {
      const tabButton = document.createElement("button");
      tabButton.type = "button";
      tabButton.dataset.tab = "actions";
      tabButton.dataset.group = "primary";
      tabButton.dataset.action = "tab";
      tabButton.dataset.tooltip = game.i18n.localize("ACTIONSTAB.TabName");
      tabButton.setAttribute("aria-label", game.i18n.localize("ACTIONSTAB.TabName"));
      tabButton.innerHTML = '<i class="fas fa-fist-raised"></i>';
      tabNav.appendChild(tabButton);
    }

    // Remove stale tab content (ApplicationV2 partial re-renders destroy sheet-body
    // contents but keep the tab nav, so we must recreate content each render)
    const existingContent = element.querySelector('[data-tab="actions"][data-group="primary"].tab');
    if (existingContent) existingContent.remove();

    // Create the tab content
    const actionsContent = this._createActionsTabContent(app.actor);

    // Append to .tab-body inside .main-content (alongside native dnd5e tabs)
    // This ensures the actions tab respects the collapsible sidebar layout
    const tabBody = element.querySelector('.tab-body[data-container-id="tabs"]');
    if (tabBody) {
      tabBody.appendChild(actionsContent);
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

    const content = document.createElement("section");
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
        // Check if spell is unprepared (for manually added spells)
        const item = actor.items.get(action.id);
        const isPrepared = item ? this._isSpellPrepared(item) : true;
        const unpreparedClass = isPrepared ? "" : " unprepared";
        const unpreparedTitle = isPrepared
          ? ""
          : ` (${game.i18n.localize("ACTIONSTAB.Unprepared")})`;

        actionsHtml += `
          <div class="action-item${unpreparedClass}" data-action-id="${action.id}">
            <img class="action-image" src="${action.img}" title="${action.name}${unpreparedTitle}">
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

      // Skip unprepared spells (cantrips and always/innate/pact/atwill are always included)
      if (item.type === "spell" && !this._isSpellAvailable(item)) return;

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
   * Check if a spell is available for auto-population.
   * Cantrips, always-prepared, innate, pact, and at-will spells are always available.
   * Prepared-mode spells must be actively prepared.
   * @param {Item5e} item - The spell item
   * @returns {boolean} Whether the spell should be included
   */
  static _isSpellAvailable(item) {
    const prep = item.system.preparation;
    if (!prep) return true;

    // Cantrips are always available
    if (item.system.level === 0) return true;

    // These preparation modes don't require active preparation
    const alwaysAvailable = ["always", "innate", "pact", "atwill"];
    if (alwaysAvailable.includes(prep.mode)) return true;

    // For "prepared" mode, check if actually prepared
    if (prep.mode === "prepared") return !!prep.prepared;

    return true;
  }

  /**
   * Check if a spell item is currently prepared (for UI display purposes).
   * Returns true for non-spells, cantrips, always/innate/pact/atwill, and prepared spells.
   * Returns false only for prepared-mode spells that are not currently prepared.
   * @param {Item5e} item - The item to check
   * @returns {boolean} Whether the spell is prepared
   */
  static _isSpellPrepared(item) {
    if (item.type !== "spell") return true;
    return this._isSpellAvailable(item);
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
