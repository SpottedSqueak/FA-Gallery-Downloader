import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs-extra';

const dbLocation = './fa_gallery_downloader/databases/fa-gallery-downloader.db';
let db = null;

/**
 * Marks the given content_url as saved (downloaded).
 * @param {String} content_url 
 * @returns Database Promise
 */
export function contentSaved(content_url) {
  return db.run(`
  UPDATE subdata
  SET
    is_content_saved = 1
  WHERE content_url = '${content_url}'
  `);
}
/**
 * Selects the next content_url to download.
 * @returns Database Promise that resolves to results of query
 */
export function getNextUnsavedContent() {
  return db.get(`
  SELECT content_url, content_name
  FROM subdata
  WHERE is_content_saved = 0
  `);
}

export function needsUsernames() {
  return db.all(`
  SELECT url
  FROM subdata
  WHERE username IS NULL
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
  SELECT url
  FROM subdata
  WHERE id IS null
  `);
}
/**
 * Creates blank entries in the database for all given submission URLs
 * for later updating.
 * @param {Array<Strings>} links 
 * @param {Boolean} isScrap 
 * @returns 
 */
export function saveLinks(links, isScrap = false) {
  let placeholder = [];
  const data = links.reduce((acc, val) => {
    placeholder.push('(?,?,?)');
    acc.push(val, isScrap, false);
    return acc;
    }, []);
  placeholder.join(',');
  return db.run(`
  INSERT INTO subdata (
    url, 
    is_scrap, 
    is_content_saved
  ) 
  VALUES ${placeholder}`, ...data);
}
/**
 * 
 * @returns All data in the database
 */
export function getAllData() {
  return db.all('SELECT * from subdata WHERE id IS NOT null');
}

export async function upgradeDatabase() {
  const { user_version } = await db.get('PRAGMA user_version');
  let version = user_version;
  let error = null;
  switch(user_version) {
    case 0:
    case 1:
      await db.exec('ALTER TABLE subdata ADD COLUMN username TEXT')
        .catch(e => {
          console.log(e);
          error = true;
        });
      version = 2;
    default:
      if(error) return error;
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
  const hasError = await upgradeDatabase();
  if(hasError) process.exit(2);
  // Create base table
  return db.exec(`
  CREATE TABLE IF NOT EXISTS subdata (
    id TEXT UNIQUE ON CONFLICT IGNORE, 
    title TEXT, 
    desc TEXT, 
    tags TEXT, 
    url TEXT UNIQUE ON CONFLICT IGNORE, 
    is_scrap INTEGER, 
    date_uploaded TEXT, 
    content_url TEXT, 
    content_name TEXT, 
    is_content_saved INTEGER
  )`);
}
