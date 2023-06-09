import { waitFor, log, logProgress, stop } from './utils.js';
import { faRequestHeaders } from './login.js';
import * as db from './database-interface.js';
import fs from 'fs-extra';
import got from 'got';

const progressID = 'file';
const downloadDir = './fa_gallery_downloader/downloaded_content';

/**
 * Handles the actual download and progress update for file saving.
 * @param {Object} results Results of a db query
 * @param {String} results.content_url
 * @param {String} results.content_name
 * @returns 
 */
function downloadSetup(content_url, content_name, username) {
  return new Promise((resolve, reject) => {
    fs.ensureDirSync(`${downloadDir}/${username}`);
    const dlStream = got.stream(content_url, faRequestHeaders);
    const fStream = fs.createWriteStream(`${downloadDir}/${username}/${content_name}`);
    dlStream.on("downloadProgress", ({ transferred, total, percent }) => {
      const percentage = Math.round(percent * 100);
      logProgress({ transferred, total, percentage, filename: content_name }, progressID);
    })
    .on("error", (error) => {
      logProgress.reset(progressID);
      console.error(`Download failed: ${error.message}`);
      reject();
    });

    fStream.on("error", (error) => {
        logProgress.reset(progressID);
        console.error(`Could not write file to system: ${error.message}`);
        reject();
      })
      .on("finish", () => {
        // log(`[File] Downloaded: "${content_name}"`, progressID);
        resolve();
      });
    dlStream.pipe(fStream);
  });
}

export async function cleanupFileStructure() {
  const content = await db.getAllDownloadedContentData();
  if (!content.length) return;
  log('[Data] Reorganizing files...');
  function getPromise(index) {
    if (index >= content.length) return;
    const { username, content_name } = content[index];
    fs.ensureDirSync(`${downloadDir}/${username}`);
    return fs.move(`${downloadDir}/${content_name}`, `${downloadDir}/${username}/${content_name}`)
    .then(() => {
      // Set file as moved properly
      return db.setContentMoved(content_name);
    }).catch(() => {
      // Do some fallback to make sure it wasn't already moved?
      if (fs.existsSync(`${downloadDir}/${username}/${content_name}`))
        return db.setContentMoved(content_name);
      else 
        log(`[Warn] File not moved: ${content_name}`);
    });
  }
  let i = 0;
  while (i < content.length) {
    if (stop.now) return;
    // Move 3 files at a time
    await Promise.all([
      getPromise(i++),
      getPromise(i++),
      getPromise(i++)
    ]);
  }
  log(`[Data] Files reorganized by user!`);
}
export async function downloadSpecificContent({ content_url, content_name, username}) {
  if (stop.now) return;
  await downloadSetup(content_url, content_name, username);
  return db.setContentSaved(content_url);
}
/**
 * Gets the next content_url to download and records when it's finally saved.
 * @returns 
 */
async function startNextDownload(name) {
  if (stop.now) return;
  const contentInfo = await db.getNextUnsavedContent(name);
  if (!contentInfo) return;
  await downloadSpecificContent(contentInfo);
  await waitFor(2000);
  startNextDownload(name);
}
/**
 * Starts the download loop for all content.
 * @returns 
 */
export async function initDownloads(name) {
  fs.ensureDirSync(downloadDir);
  await waitFor(5000);
  if (stop.now) return;
  log('[File] Starting downloads...', progressID);
  return startNextDownload(name);
}
