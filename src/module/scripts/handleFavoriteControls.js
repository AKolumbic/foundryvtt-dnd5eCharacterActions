import { MODULE_ABBREV, MODULE_ID, MyFlags } from './constants';
import { getGame, log } from './helpers';
import { isItemInActionList } from './api';

export function addFavoriteControls(app, html) {
  function createFavButton(filterOverride) {
    return `<a class="item-control item-action-filter-override ${filterOverride ? 'active' : ''}" title="${
      filterOverride
        ? getGame().i18n.localize(`${MODULE_ABBREV}.button.setOverrideFalse`)
        : getGame().i18n.localize(`${MODULE_ABBREV}.button.setOverrideTrue`)
    }">
      <i class="fas fa-fist-raised">
        <i class="fas fa-slash"></i>
        <i class="fas fa-plus"></i>
      </i>
      <span class="control-label">${
        filterOverride
          ? getGame().i18n.localize(`${MODULE_ABBREV}.button.setOverrideFalse`)
          : getGame().i18n.localize(`${MODULE_ABBREV}.button.setOverrideTrue`)
      }</span>
    </a>`;
  }

  // add button to toggle favourite of the item in their native tab
  if (app.options.editable) {
    // Handle Click on our action
    $(html).on('click', 'a.item-action-filter-override', async (e) => {
      try {
        const closestItemLi = $(e.target).parents('[data-item-id]')[0]; // BRITTLE
        const itemId = closestItemLi.dataset.itemId;
        const relevantItem = itemId && app.object.items.get(itemId);
        if (!relevantItem) {
          return;
        }
        const currentFilter = isItemInActionList(relevantItem);

        // set the flag to be the opposite of what it is now
        await relevantItem.setFlag(MODULE_ID, MyFlags.filterOverride, !currentFilter);

        // Find the actions tab and re-render it
        const actionsTab = $(html).find('.tab.actions');
        if (actionsTab.length) {
          // Import the renderActionsList function if needed
          const { renderActionsList } = await import('./api.js');

          // Re-render the actions list
          const actionsTabHtml = $(await renderActionsList(app.object, { sheetVersion: 'actor-actions-list-v2' }));
          actionsTab.empty().append(actionsTabHtml);

          // Re-attach event handlers
          if (app.object.isOwner) {
            actionsTabHtml.find('.item .item-image').click((event) => app._onItemUse(event));
            actionsTabHtml.find('.item .item-recharge').click((event) => app._onItemRecharge(event));
          }
        }

        log(false, 'a.item-action-filter-override click registered and tab re-rendered', {
          closestItemLi,
          itemId,
          relevantItem,
          currentFilter,
        });
      } catch (e) {
        log(true, 'Error trying to set flag on item', e);
      }
    });

    // Add button to all item rows
    html.find('[data-item-id]').each((_index, element) => {
      const itemId = element.dataset.itemId;
      const relevantItem = itemId && app.object.items.get(itemId);
      if (!relevantItem) {
        return;
      }
      const currentFilter = isItemInActionList(relevantItem);

      // log(false, { itemId, currentFilter });

      $(element).find('.item-controls').append(createFavButton(currentFilter));
    });
  }
}
