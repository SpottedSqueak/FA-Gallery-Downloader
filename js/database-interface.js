import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs-extra';
import process from 'node:process';

const dbLocation = './fa_gallery_downloader/databases/fa-gallery-downloader.db';
let db = null;

function genericInsert(table, columns, placeholders, data) {
  return db.run(`
  INSERT INTO ${table} (${columns})
  VALUES ${placeholders.join(',')}
`, ...data);
}
export function getGalleryPage(offset = 0, count = 25, query = {}) {
  let { username, searchTerm, galleryType } = query;
  let searchQuery = '';
  let galleryQuery = '';
  let usernameQuery = '';

  if (searchTerm) {
    searchTerm = `${searchTerm.replace(/\s/gi, '%')}`;
    searchQuery =`
      AND (
        title LIKE '%${searchTerm}%'
        OR
        tags LIKE '%${searchTerm}%'
        OR
        desc LIKE '%${searchTerm}%'
        OR 
        content_name LIKE '%${searchTerm}'
      )`;
  }
  if (galleryType && username) {
    galleryQuery = `
      AND url IN (
        SELECT url
        FROM favorites f
        WHERE f.username LIKE '%${username}%'
      )
    `;
  } else {
    if (username) {
      usernameQuery = `
        AND username LIKE '%${username}%'
        `;
    }
  }
  const dbQuery = `
  SELECT 
    id, 
    title,
    username,
    content_name,
    date_uploaded,
    is_content_saved
  FROM subdata
  WHERE id IS NOT NULL
  ${searchQuery}
  ${usernameQuery}
  ${galleryQuery}
  ORDER BY id DESC
  LIMIT ${count} OFFSET ${offset}
  `;
  return db.all(dbQuery);
}
/**
 * Returns all 
 * @param {String} id 
 * @returns 
 */
export async function getSubmissionPage(id) {
  const data = {};
  data.submission = await db.get(`
  SELECT *
  FROM subdata
  WHERE id = ${id}
  `);
  data.comments = await db.all(`
    SELECT *
    FROM commentdata
    WHERE submission_id = '${id}'
  `);
  return data;
}
/**
 * Marks the given content_url as saved (downloaded).
 * @param {String} content_url 
 * @returns Database Promise
 */
export function setContentSaved(content_url) {
  return db.run(`
  UPDATE subdata
  SET
    is_content_saved = 1,
    moved_content = 1
  WHERE content_url = '${content_url}'
  `);
}
export function setContentMoved(content_name) {
  return db.run(`
  UPDATE subdata
  SET
    moved_content = 1
  WHERE content_name = '${content_name}'
  `);
}
export function getAllDownloadedContentData() {
  return db.all(`
  SELECT content_url, content_name, username
  FROM subdata
  WHERE is_content_saved = 1
    AND moved_content = 0
  `);
}
/**
 * Selects the next content_url to download.
 * @returns Database Promise that resolves to results of query
 */
export function getNextUnsavedContent(name) {
  const defaultQuery = `
    SELECT content_url, content_name, username
    FROM subdata
    WHERE is_content_saved = 0
    AND content_url IS NOT NULL
  `;
  if (!name) return db.get(defaultQuery);
  const query =`
    SELECT content_url, content_name, username
    FROM subdata
    WHERE is_content_saved = 0
    AND content_url IS NOT NULL
    AND username LIKE '${name}'
  `;
  return db.get(query).then(results => {
    if (!results?.content_name) return db.get(defaultQuery);
    else return results;
  })
}
/**
 * Returns all entries without necessary data.
 * @returns 
 */
export function needsRepair() {
  return db.all(`
  SELECT url
  FROM subdata
  WHERE username IS NULL
  AND id IS NOT NULL
  `);
}
export function getAllUsernames() {
  return db.all(`
  SELECT DISTINCT username
  FROM subdata
  WHERE username IS NOT NULL
  `);
}
/**
 * Takes the given data for the given url and updates the appropriate database columns.
 * @param {String} url 
 * @param {Object} d 
 * @returns Database Promise
 */
export function saveMetaData(url, d) {
  const data = [
    d.id,
    d.title,
    d.desc,
    d.tags,
    d.content_name,
    d.content_url,
    d.date_uploaded,
    d.username,
  ];
  return db.run(`
  UPDATE subdata
  SET 
    id = ?,
    title = ?,
    desc = ?,
    tags = ?,
    content_name = ?,
    content_url =?,
    date_uploaded = ?,
    username = ?
  WHERE url = '${url}'`, ...data);
}
/**
 * Retrieves all submission links with uncollected data.
 * @param {Boolean} isScraps 
 * @returns Promise that resolves to all matching Database rows
 */
export function getSubmissionLinks() {
  return db.all(`
  SELECT rowid, url
  FROM subdata
  WHERE id IS null
  ORDER BY rowid DESC
  `);
}
/**
 * Creates blank entries in the database for all given submission URLs
 * for later updating.
 * @param {Array<Strings>} links 
 * @param {Boolean} isScraps 
 * @returns 
 */
export function saveLinks(links, isScraps = false) {
  let placeholder = [];
  const data = links.reduce((acc, val) => {
    let data = [val, isScraps, false];
    let marks = `(${data.map(()=>'?').join(',')})`;
    acc.push(...data);
    placeholder.push(marks);
    return acc;
    }, []);
  return genericInsert('subdata', 'url, is_scrap, is_content_saved', placeholder, data);
}
export function saveComments(comments) {
  let placeholder = [];
  const data = comments.reduce((acc, c) => {
    let data = [c.id, c.submission_id, c.width, c.username, c.desc, c.subtitle, c.date];
    let marks = `(${data.map(()=>'?').join(',')})`;
    acc.push(...data);
    placeholder.push(marks);
    return acc;
  }, []);
  placeholder.join(',');
  return db.run(`
  INSERT INTO commentdata (
    id,
    submission_id,
    width,
    username,
    desc,
    subtitle,
    date
  ) 
  VALUES ${placeholder}
  ON CONFLICT(id) DO UPDATE SET
    desc = excluded.desc
  `, ...data);
}
export function getComments(id) {
  return db.all(`
  SELECT *
  FROM commentdata
  WHERE submission_id = ${id}
  AND desc IS NOT NULL
  `);
}
export function setOwnedAccount(username) {
  if (!username) return;
  return genericInsert('ownedaccounts', 'username', ['(?)'], [username]);
}
export function getOwnedAccounts() {
  return db.all(`
    SELECT *
    FROM ownedaccounts
  `);
}
export function saveFavorites(username, links) {
  let placeholder = [];
  const data = links.reduce((acc, val) => {
    let data = [username+val, username, val];
    let marks = `(${data.map(()=>'?').join(',')})`;
    acc.push(...data);
    placeholder.push(marks);
    return acc;
    }, []);
  return genericInsert('favorites', 'id, username, url', placeholder, data);
}
export function getAllFavoritesForUser(username) {
  if (!username) return;
  return db.all(`
    SELECT *
    FROM subdata
    WHERE url IN (
      SELECT url
      FROM favorites
      WHERE username = '${username}'
    )
  `);
}
/**
 * 
 * @returns All data in the database
 */
export function getAllSubmissionData() {
  return db.all('SELECT url from subdata');
}
/**
 * 
 * @returns All complete data in the database
 */
export function getAllCompleteSubmissionData() {
  return db.all('SELECT * from subdata WHERE id IS NOT NULL');
}
export async function fixFavoritesUsernames() {
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
/**
 * Used for making future upgrades/updates to the database, to enforce
 * a schema.
 * @returns If an error occurred or not. If yes, we need to exit!
 */
export async function upgradeDatabase() {
  const { user_version } = await db.get('PRAGMA user_version');
  let version = user_version;
  switch(user_version) {
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
      await fixFavoritesUsernames();
      version = 6;
    default:
      await db.exec(`PRAGMA auto_vacuum = INCREMENTAL`);
      await db.exec(`PRAGMA user_version = ${version}`);
      console.log(`Database now at: v${version}`);
  }
}

/**
 * Creates appropriate database tables.
 * @returns 
 */
export async function init() {
  fs.ensureFileSync(dbLocation);
  sqlite3.verbose();
  db = await open({
    filename: dbLocation,
    driver: sqlite3.cached.Database,
  });
  // Check for existence of necessary tables
  return db.get(`
    SELECT name 
    FROM sqlite_master 
    WHERE type='table' AND name='subdata'
  `).then(({ name } = {}) => {
    // If not found, we need to create the table
    if (!name) {
      return db.exec(`
        CREATE TABLE subdata (
          id TEXT PRIMARY KEY,
          title TEXT, 
          desc TEXT, 
          tags TEXT, 
          url TEXT UNIQUE ON CONFLICT IGNORE, 
          is_scrap INTEGER, 
          date_uploaded TEXT, 
          content_url TEXT, 
          content_name TEXT, 
          is_content_saved INTEGER,
          username TEXT
        )`)
        .then(db.exec(`PRAGMA user_version = 2`));
    }
  })
  .then(upgradeDatabase)
  .catch((e) => {
    console.error(e);
    process.exit(2);
  });
}
