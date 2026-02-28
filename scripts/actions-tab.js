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

    // dnd5e context menu hook for native sheet items
    Hooks.on("dnd5e.getItemContextOptions", this._onGetItemContextOptions.bind(this));
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

    // Configure gear icon (top-right corner)
    const configBtn = document.createElement("a");
    configBtn.className = "configure-actions";
    configBtn.title = game.i18n.localize("ACTIONSTAB.Configure");
    configBtn.innerHTML = '<i class="fas fa-cog"></i>';
    content.appendChild(configBtn);

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
    const excludedIds = actor.getFlag(MODULE_ID, "excludedActions") || [];

    actor.items.forEach((item) => {
      // Skip items on the exclusion list
      if (excludedIds.includes(item.id)) return;
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
   * Determine the action type from an item's activities
   * @param {Item5e} item - The item to check
   * @returns {string|null} The action type or null if no matching activity
   */
  static _getActionTypeFromItem(item) {
    if (!item.system.activities || item.system.activities.size === 0) return null;

    for (const activity of item.system.activities) {
      const activationType = activity.activation?.type;
      switch (activationType) {
        case "action": return ACTION_TYPES.ACTION;
        case "bonus": return ACTION_TYPES.BONUS_ACTION;
        case "reaction": return ACTION_TYPES.REACTION;
        case "special": return ACTION_TYPES.SPECIAL;
        default: continue;
      }
    }
    return null;
  }

  /**
   * Add an item to the Actions tab for a given actor
   * @param {Actor5e} actor - The actor
   * @param {Item5e} item - The item to add
   */
  static async _addToActionsTab(actor, item) {
    const actionType = this._getActionTypeFromItem(item);
    if (!actionType) return;

    const actions = actor.getFlag(MODULE_ID, "actions") || [];
    // Don't add duplicates
    if (actions.some((a) => a.id === item.id)) return;

    actions.push({
      id: item.id,
      name: item.name,
      img: item.img,
      actionType,
      type: item.type,
    });
    await actor.setFlag(MODULE_ID, "actions", actions);

    // Remove from exclusion list if present
    const excluded = actor.getFlag(MODULE_ID, "excludedActions") || [];
    if (excluded.includes(item.id)) {
      await actor.setFlag(
        MODULE_ID,
        "excludedActions",
        excluded.filter((id) => id !== item.id)
      );
    }
  }

  /**
   * Remove an item from the Actions tab for a given actor
   * @param {Actor5e} actor - The actor
   * @param {string} itemId - The item ID to remove
   */
  static async _removeFromActionsTab(actor, itemId) {
    const actions = actor.getFlag(MODULE_ID, "actions") || [];
    const updatedActions = actions.filter((a) => a.id !== itemId);

    if (actions.length !== updatedActions.length) {
      await actor.setFlag(MODULE_ID, "actions", updatedActions);
    }

    // If auto-populate is on, add to exclusion list so it doesn't reappear
    if (game.settings.get(MODULE_ID, "autoPopulate")) {
      const excluded = actor.getFlag(MODULE_ID, "excludedActions") || [];
      if (!excluded.includes(itemId)) {
        excluded.push(itemId);
        await actor.setFlag(MODULE_ID, "excludedActions", excluded);
      }
    }
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

    // Card click → toggle detail panel
    element.querySelectorAll(".action-item").forEach((card) => {
      card.addEventListener("click", this._onToggleDetailPanel.bind(this, app));
    });

    // Drag-and-drop reordering
    this._addReorderListeners(element, app);

    // Right-click context menu on action cards
    element.querySelectorAll(".action-item").forEach((card) => {
      card.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        const actionId = card.dataset.actionId;
        this._showContextMenu(event, [
          {
            label: game.i18n.localize("ACTIONSTAB.ContextMenu.RemoveFromActions"),
            callback: () => this._removeFromActionsTab(app.actor, actionId).then(() => app.render({ force: true })),
          },
        ]);
      });
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
   * Handle toggling the detail panel for an action card
   * @param {ApplicationV2} app - The character sheet application
   * @param {Event} event - The click event
   */
  static _onToggleDetailPanel(app, event) {
    event.preventDefault();

    const card = event.currentTarget;
    // Suppress click after drag
    if (card.dataset.justDragged) return;

    const actionId = card.dataset.actionId;
    const category = card.closest(".actions-category");
    if (!category) return;

    const existingPanel = category.querySelector(".action-detail-panel");

    // If panel open for same card → close it
    if (existingPanel && existingPanel.dataset.actionId === actionId) {
      existingPanel.remove();
      card.classList.remove("expanded");
      return;
    }

    // If panel open for different card → close old
    if (existingPanel) {
      const oldCard = category.querySelector(`.action-item.expanded`);
      if (oldCard) oldCard.classList.remove("expanded");
      existingPanel.remove();
    }

    // Open new panel
    const panel = this._createDetailPanel(app.actor, actionId, app);
    if (!panel) return;

    card.classList.add("expanded");
    const actionsList = category.querySelector(".actions-list");
    actionsList.insertAdjacentElement("afterend", panel);
  }

  /**
   * Create a detail panel for an action
   * @param {Actor5e} actor - The actor
   * @param {string} actionId - The action/item ID
   * @param {ApplicationV2} app - The character sheet application
   * @returns {HTMLElement|null} The detail panel element
   */
  static _createDetailPanel(actor, actionId, app) {
    const item = actor.items.get(actionId);
    if (!item) return null;

    const panel = document.createElement("div");
    panel.className = "action-detail-panel";
    panel.dataset.actionId = actionId;

    const description = item.system.description?.value || "";

    panel.innerHTML = `
      <div class="detail-panel-content">
        <button class="detail-panel-close"><i class="fas fa-times"></i></button>
        <div class="detail-panel-header">
          <img src="${item.img}" class="detail-panel-image">
          <h3 class="detail-panel-name">${item.name}</h3>
        </div>
        <div class="detail-panel-description">${description}</div>
        <div class="detail-panel-buttons">
          <button class="detail-panel-use"><i class="fas fa-dice-d20"></i> ${game.i18n.localize("ACTIONSTAB.DetailPanel.UseItem")}</button>
          <button class="detail-panel-sheet"><i class="fas fa-edit"></i> ${game.i18n.localize("ACTIONSTAB.DetailPanel.OpenSheet")}</button>
        </div>
      </div>
    `;

    // Close button
    panel.querySelector(".detail-panel-close").addEventListener("click", (e) => {
      e.stopPropagation();
      const category = panel.closest(".actions-category");
      if (category) {
        const expandedCard = category.querySelector(".action-item.expanded");
        if (expandedCard) expandedCard.classList.remove("expanded");
      }
      panel.remove();
    });

    // Use Item button
    panel.querySelector(".detail-panel-use").addEventListener("click", (e) => {
      e.stopPropagation();
      item.use();
    });

    // Open Sheet button
    panel.querySelector(".detail-panel-sheet").addEventListener("click", (e) => {
      e.stopPropagation();
      item.sheet.render(true);
    });

    return panel;
  }

  /**
   * Add drag-and-drop reorder listeners to action cards
   * @param {HTMLElement} element - The sheet HTML element
   * @param {ApplicationV2} app - The character sheet application
   */
  static _addReorderListeners(element, app) {
    element.querySelectorAll(".actions-category .action-item").forEach((card) => {
      card.setAttribute("draggable", "true");

      card.addEventListener("dragstart", (e) => {
        const actionId = card.dataset.actionId;
        const sourceCategory = card.closest(".actions-category").dataset.category;
        e.dataTransfer.setData("text/plain", JSON.stringify({ actionId, sourceCategory }));
        e.dataTransfer.effectAllowed = "move";
        card.classList.add("dragging");
      });

      card.addEventListener("dragend", (e) => {
        card.classList.remove("dragging");
        // Suppress click after drag
        card.dataset.justDragged = "true";
        setTimeout(() => delete card.dataset.justDragged, 50);
        // Clean up indicators
        element.querySelectorAll(".drag-over-before, .drag-over-after").forEach(
          (el) => el.classList.remove("drag-over-before", "drag-over-after")
        );
      });

      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });

      card.addEventListener("dragleave", (e) => {
        card.classList.remove("drag-over-before", "drag-over-after");
      });

      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("drag-over-before", "drag-over-after");

        let data;
        try {
          data = JSON.parse(e.dataTransfer.getData("text/plain"));
        } catch { return; }

        const targetCategory = card.closest(".actions-category").dataset.category;
        // Only allow reorder within same category
        if (data.sourceCategory !== targetCategory) return;
        if (data.actionId === card.dataset.actionId) return;

        this._reorderAction(app.actor, data.actionId, targetCategory, card.dataset.actionId)
          .then(() => app.render({ force: true }));
      });
    });

    // Also allow dropping at end of list (on the .actions-list container itself)
    element.querySelectorAll(".actions-list").forEach((list) => {
      list.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });

      list.addEventListener("drop", (e) => {
        // Only handle if dropped on the list itself, not on a card
        if (e.target !== list) return;
        e.preventDefault();

        let data;
        try {
          data = JSON.parse(e.dataTransfer.getData("text/plain"));
        } catch { return; }

        const targetCategory = list.closest(".actions-category").dataset.category;
        if (data.sourceCategory !== targetCategory) return;

        // Drop at end (no insertBeforeId)
        this._reorderAction(app.actor, data.actionId, targetCategory, null)
          .then(() => app.render({ force: true }));
      });
    });
  }

  /**
   * Show a lightweight custom context menu
   * @param {MouseEvent} event - The contextmenu event
   * @param {Array<{label: string, callback: Function}>} menuItems - Menu items
   */
  static _showContextMenu(event, menuItems) {
    // Remove any existing context menu
    document.querySelectorAll(".actions-tab-context-menu").forEach((m) => m.remove());

    const menu = document.createElement("nav");
    menu.className = "actions-tab-context-menu";
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;

    const ol = document.createElement("ol");
    for (const item of menuItems) {
      const li = document.createElement("li");
      li.textContent = item.label;
      li.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.remove();
        item.callback();
      });
      ol.appendChild(li);
    }
    menu.appendChild(ol);
    document.body.appendChild(menu);

    // Close on click outside
    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener("click", closeHandler, true);
      }
    };
    // Use setTimeout so the current event doesn't immediately close it
    setTimeout(() => document.addEventListener("click", closeHandler, true), 0);
  }

  /**
   * Reorder an action within a category in the flag array
   * @param {Actor5e} actor - The actor
   * @param {string} actionId - The dragged action's ID
   * @param {string} category - The action category
   * @param {string|null} insertBeforeId - The ID to insert before, or null for end
   */
  static async _reorderAction(actor, actionId, category, insertBeforeId) {
    const actions = actor.getFlag(MODULE_ID, "actions") || [];

    const draggedIndex = actions.findIndex((a) => a.id === actionId);
    if (draggedIndex === -1) return;

    const dragged = actions[draggedIndex];
    // Remove dragged item
    actions.splice(draggedIndex, 1);

    if (insertBeforeId) {
      const targetIndex = actions.findIndex((a) => a.id === insertBeforeId);
      if (targetIndex !== -1) {
        actions.splice(targetIndex, 0, dragged);
      } else {
        actions.push(dragged);
      }
    } else {
      // Insert at end of category: find last item in this category
      let lastCategoryIndex = -1;
      for (let i = actions.length - 1; i >= 0; i--) {
        if (actions[i].actionType === category) {
          lastCategoryIndex = i;
          break;
        }
      }
      if (lastCategoryIndex !== -1) {
        actions.splice(lastCategoryIndex + 1, 0, dragged);
      } else {
        actions.push(dragged);
      }
    }

    await actor.setFlag(MODULE_ID, "actions", actions);
  }

  /**
   * Hook into dnd5e's item context menu to add/remove actions tab options
   * @param {Item5e} item - The item
   * @param {Array} menuItems - The context menu items array
   */
  static _onGetItemContextOptions(item, menuItems) {
    if (!item.parent || item.parent.type !== "character") return;

    const actor = item.parent;
    const actions = actor.getFlag(MODULE_ID, "actions") || [];
    const isInActions = actions.some((a) => a.id === item.id);

    if (isInActions) {
      menuItems.push({
        name: game.i18n.localize("ACTIONSTAB.ContextMenu.RemoveFromActions"),
        icon: '<i class="fas fa-minus-circle"></i>',
        callback: () => this._removeFromActionsTab(actor, item.id),
      });
    } else {
      menuItems.push({
        name: game.i18n.localize("ACTIONSTAB.ContextMenu.AddToActions"),
        icon: '<i class="fas fa-plus-circle"></i>',
        callback: () => this._addToActionsTab(actor, item),
      });
    }
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

    // Clean exclusion list
    const excluded = item.parent.getFlag(MODULE_ID, "excludedActions") || [];
    if (excluded.includes(item.id)) {
      item.parent.setFlag(
        MODULE_ID,
        "excludedActions",
        excluded.filter((id) => id !== item.id)
      );
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
