import { waitFor, log, logProgress, stop } from './utils.js';
import { faRequestHeaders } from './login.js';
import * as db from './database-interface.js';
import fs from 'fs-extra';
import got from 'got';

const progressID = 'file-progress-bar';
const downloadDir = './fa_gallery_downloader/downloaded_content';

/**
 * Handles the actual download and progress update for file saving.
 * @param {Object} results Results of a db query
 * @param {String} results.content_url
 * @param {String} results.content_name
 * @returns 
 */
function downloadSetup(content_url, content_name) {
  return new Promise((resolve, reject) => {
    const dlStream = got.stream(content_url, faRequestHeaders);
    const fStream = fs.createWriteStream(`${downloadDir}/${content_name}`);
    dlStream.on("downloadProgress", ({ transferred, total, percent }) => {
      const percentage = Math.round(percent * 100);
      logProgress({ transferred, total, percentage }, progressID);
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

export async function downloadSpecificContent(content_url, content_name) {
  if (stop.now) return;
  await downloadSetup(content_url, content_name);
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
  const { content_url, content_name } = contentInfo;
  await downloadSpecificContent(content_url, content_name);
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
