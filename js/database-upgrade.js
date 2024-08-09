import { cleanupFileStructure, deleteInvalidFiles, fixInvalidUsernames } from "./download-content.js";

async function fixFavoritesUsernames(db) {
  await db.exec(`
    CREATE TABLE favTemp (
      id TEXT UNIQUE ON CONFLICT IGNORE,
      url TEXT,
      username TEXT
    )`);
  await db.exec(`
    INSERT INTO favTemp
    SELECT LOWER(id) AS id, LOWER(username) AS username, url FROM favorites
  `);
  await db.exec(`INSERT INTO favorites SELECT * FROM favTemp`);
  await db.exec(`DELETE FROM favorites WHERE LOWER(id) <> id`);
  return await db.exec(`DROP TABLE favTemp`);
}

async function createThumbnailInfo(db) {
  await db.exec('ALTER TABLE subdata ADD COLUMN thumbnail_url TEXT')
    .catch(() => {});
  await db.exec(`
    ALTER TABLE subdata
    ADD COLUMN thumbnail_name TEXT
  `).catch(() => {});
  return db.exec(`
  ALTER TABLE subdata
  ADD COLUMN is_thumbnail_saved INTEGER default 0
`).catch(() => {});
}

/**
 * Used for making future upgrades/updates to the database, to enforce
 * a schema.
 * @returns If an error occurred or not. If yes, we need to exit!
 */
export async function upgradeDatabase(db) {
  let { user_version:version } = await db.get('PRAGMA user_version');
  switch(version) {
    case 0:
    case 1:
      await db.exec('ALTER TABLE subdata ADD COLUMN username TEXT')
        .catch(() => {/* Column already exists, just continue */});
      version = 2;
    case 2:
      await db.exec(`
      CREATE TABLE IF NOT EXISTS commentdata (
        id TEXT UNIQUE ON CONFLICT REPLACE,
        submission_id TEXT,
        width TEXT,
        username TEXT,
        desc TEXT,
        subtitle TEXT,
        date TEXT
      )`);
      version = 3;
    case 3:
      await db.exec(`
      CREATE TABLE IF NOT EXISTS ownedaccounts (
        username TEXT UNIQUE ON CONFLICT IGNORE
      )`);
      await db.exec(`
      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT UNIQUE ON CONFLICT IGNORE,
        url TEXT,
        username TEXT
      )`);
      version = 4;
    case 4:
      await db.exec('ALTER TABLE subdata ADD COLUMN moved_content INTEGER default 0')
      .catch(() => {/* Column already exists, just continue */});
      version = 5;
    case 5:
      await fixFavoritesUsernames(db);
      version = 6;
    case 6:
      await db.exec(`
      CREATE TABLE IF NOT EXISTS usersettings (
        latest_browser_version TEXT
      )`);
      await db.exec(`
        INSERT INTO usersettings(latest_browser_version)
        VALUES('')
      `);
      version = 7;
    case 7:
      await createThumbnailInfo(db);
      version = 8;  
    case 8:
      await db.exec(`ALTER TABLE subdata ADD COLUMN rating TEXT`)
      .catch(() => {});
      await db.exec(`ALTER TABLE subdata ADD COLUMN category TEXT`)
      .catch(() => {});
      version = 9;
    case 9:
      await db.exec(`ALTER TABLE subdata ADD COLUMN account_name TEXT`)
      .catch(() => {});
      await db.exec(`ALTER TABLE commentdata ADD COLUMN account_name TEXT`)
      .catch(() => {});
      await db.exec(`
        UPDATE subdata
        SET 
          account_name = REPLACE(username, '_', '')
        where username IS NOT NULL
      `);
      await db.exec(`
        UPDATE commentdata
        SET 
          account_name = REPLACE(username, '_', '')
        where username IS NOT NULL
      `);
      version = 10;
    case 10:
      // Should only need to do these once
      await cleanupFileStructure();
      await deleteInvalidFiles();
      version = 11;
    case 11:
      await db.exec(`ALTER TABLE subdata ADD COLUMN content_missing INTEGER default 0`).catch(() => {});
      await db.exec(`ALTER TABLE subdata ADD COLUMN thumbnail_missing INTEGER default 0`).catch(() => {});
      version = 12;
    case 12:
      await fixInvalidUsernames();
      version = 13;
      
    default:
      await db.exec(`VACUUM`);
      await db.exec(`PRAGMA user_version = ${version}`);
      console.log(`Database now at: v${version}`);
  }
}