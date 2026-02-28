/**
 * Actions Tab Configuration Dialog
 * Allows users to configure the actions displayed in the Actions tab
 * Uses ApplicationV2 + HandlebarsApplicationMixin for Foundry v13
 */

import { MODULE_ID, ACTION_TYPES } from "./actions-tab.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ActionsConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
    this.actionsList = foundry.utils.deepClone(
      this.actor.getFlag(MODULE_ID, "actions") || []
    );
  }

  static DEFAULT_OPTIONS = {
    id: "actions-config-{id}",
    classes: ["actions-tab", "actions-config"],
    tag: "form",
    form: {
      handler: ActionsConfig.formHandler,
      closeOnSubmit: true,
    },
    position: {
      width: 560,
      height: "auto",
    },
    window: {
      title: "ACTIONSTAB.Dialog.Title",
    },
    actions: {
      addItem: ActionsConfig._onAddItem,
      removeAction: ActionsConfig._onRemoveAction,
      cancel: ActionsConfig._onCancel,
    },
  };

  static PARTS = {
    form: {
      template: "modules/actions-tab-5e/templates/actions-config.hbs",
    },
  };

  /**
   * Prepare context data for the template
   * @param {object} options - Render options
   * @returns {object} Template context data
   */
  async _prepareContext(options) {
    // Group actions by type
    const actionsByType = {};
    for (const type of Object.values(ACTION_TYPES)) {
      actionsByType[type] = [];
    }

    for (const action of this.actionsList) {
      const type = action.actionType || ACTION_TYPES.ACTION;
      if (!actionsByType[type]) {
        actionsByType[type] = [];
      }
      actionsByType[type].push(action);
    }

    // Get all actor items that could be actions (exclude class and race)
    const availableItems = this.actor.items
      .filter((i) => i.type !== "class" && i.type !== "race")
      .map((i) => {
        const isAdded = this.actionsList.some((a) => a.id === i.id);
        return {
          id: i.id,
          name: i.name,
          img: i.img,
          type: i.type,
          isAdded,
        };
      });

    return {
      actionTypes: Object.values(ACTION_TYPES),
      actionsByType,
      availableItems,
      actorId: this.actor.id,
    };
  }

  /**
   * Handle form submission
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormDataExtended} formData - The form data
   */
  static async formHandler(event, form, formData) {
    await this.actor.setFlag(MODULE_ID, "actions", this.actionsList);
  }

  /**
   * Set up drag-and-drop after render
   * @param {object} context - The render context
   * @param {object} options - Render options
   */
  _onRender(context, options) {
    const el = this.element;

    // Make action items draggable
    el.querySelectorAll(".action-item").forEach((item) => {
      item.setAttribute("draggable", true);
      item.addEventListener("dragstart", this._onDragStart.bind(this));
      item.addEventListener("dragend", this._onDragEnd.bind(this));
    });

    // Make action lists drop targets
    el.querySelectorAll(".actions-list").forEach((list) => {
      list.addEventListener("dragover", this._onDragOver.bind(this));
      list.addEventListener("dragleave", this._onDragLeave.bind(this));
      list.addEventListener("drop", this._onDrop.bind(this));
    });

    // Make available items draggable
    el.querySelectorAll(".item").forEach((item) => {
      item.setAttribute("draggable", true);
      item.addEventListener("dragstart", this._onItemDragStart.bind(this));
    });
  }

  /**
   * Handle adding an item to actions
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The clicked element
   */
  static _onAddItem(event, target) {
    const itemEl = target.closest(".item");
    const itemId = itemEl.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) return;

    // Determine action type from activities
    let actionType = ACTION_TYPES.ACTION;
    if (item.system.activities && item.system.activities.size > 0) {
      for (const activity of item.system.activities) {
        const activationType = activity.activation?.type;
        switch (activationType) {
          case "bonus":
            actionType = ACTION_TYPES.BONUS_ACTION;
            break;
          case "reaction":
            actionType = ACTION_TYPES.REACTION;
            break;
          case "special":
            actionType = ACTION_TYPES.SPECIAL;
            break;
        }
        break; // Use first activity
      }
    }

    this.actionsList.push({
      id: item.id,
      name: item.name,
      img: item.img,
      actionType,
      type: item.type,
    });

    this.render({ force: true });
  }

  /**
   * Handle removing an action
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The clicked element
   */
  static _onRemoveAction(event, target) {
    const actionItem = target.closest(".action-item");
    const actionId = actionItem.dataset.actionId;

    this.actionsList = this.actionsList.filter((a) => a.id !== actionId);
    this.render({ force: true });
  }

  /**
   * Handle cancel button
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The clicked element
   */
  static _onCancel(event, target) {
    this.close();
  }

  /**
   * Handle drag start for action items
   * @param {DragEvent} event - The drag event
   */
  _onDragStart(event) {
    const actionItem = event.currentTarget;
    const actionId = actionItem.dataset.actionId;
    const actionType = actionItem.closest(".actions-category").dataset.category;

    actionItem.classList.add("dragging");

    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ actionId, sourceType: actionType })
    );
  }

  /**
   * Handle drag end for action items
   * @param {DragEvent} event - The drag event
   */
  _onDragEnd(event) {
    event.currentTarget.classList.remove("dragging");
  }

  /**
   * Handle drag over for action lists
   * @param {DragEvent} event - The drag event
   */
  _onDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add("drag-over");
  }

  /**
   * Handle drag leave for action lists
   * @param {DragEvent} event - The drag event
   */
  _onDragLeave(event) {
    event.currentTarget.classList.remove("drag-over");
  }

  /**
   * Handle drop for action lists
   * @param {DragEvent} event - The drop event
   */
  _onDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove("drag-over");

    const targetCategory =
      event.currentTarget.closest(".actions-category").dataset.category;

    const data = JSON.parse(event.dataTransfer.getData("text/plain"));

    if (data.actionId) {
      const actionIndex = this.actionsList.findIndex(
        (a) => a.id === data.actionId
      );
      if (actionIndex !== -1) {
        this.actionsList[actionIndex].actionType = targetCategory;
        this.render({ force: true });
      }
    } else if (data.itemId) {
      const item = this.actor.items.get(data.itemId);
      if (item) {
        this.actionsList.push({
          id: item.id,
          name: item.name,
          img: item.img,
          actionType: targetCategory,
          type: item.type,
        });
        this.render({ force: true });
      }
    }
  }

  /**
   * Handle drag start for available items
   * @param {DragEvent} event - The drag event
   */
  _onItemDragStart(event) {
    const item = event.currentTarget;
    const itemId = item.dataset.itemId;

    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ itemId })
    );
  }
}
