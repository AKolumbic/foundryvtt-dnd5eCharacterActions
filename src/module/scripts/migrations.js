import { MODULE_ID, MySettings } from './constants';
import { getGame, log } from './helpers';

/**
 * Check if migrations need to be applied and run them
 */
export async function migrateWorldContent() {
  // Get module version from settings
  const currentVersion = game.modules.get(MODULE_ID).data.version;
  const storedVersion = getGame().settings.get(MODULE_ID, MySettings.moduleVersion);

  log(false, `Current module version: ${currentVersion}, Stored version: ${storedVersion}`);

  // If stored version is the same as current, no need to migrate
  if (storedVersion === currentVersion) return;

  log(true, `Migrating ${MODULE_ID} from version ${storedVersion} to ${currentVersion}`);

  // Run migrations based on version changes
  if (isNewerVersion(currentVersion, '7.1.0') && !isNewerVersion(storedVersion, '7.1.0')) {
    await migrateTo7_1_0();
  }

  if (isNewerVersion(currentVersion, '7.1.2') && !isNewerVersion(storedVersion, '7.1.2')) {
    await migrateTo7_1_2();
  }

  // Update stored version to current
  await getGame().settings.set(MODULE_ID, MySettings.moduleVersion, currentVersion);
  log(false, `Migration complete to version ${currentVersion}`);
}

/**
 * Migration to version 7.1.0
 */
async function migrateTo7_1_0() {
  log(false, 'Running migration to 7.1.0');
  // No specific migration needed at this time
  // This is a placeholder for future migrations
}

/**
 * Migration to version 7.1.2
 * This is the Foundry v12 & dnd5e v4 compatibility update
 */
async function migrateTo7_1_2() {
  log(false, 'Running migration to 7.1.2');
  // This migration ensures compatibility with Foundry v12 and dnd5e v4
  // No data migration needed, as the changes were all code-based
}
