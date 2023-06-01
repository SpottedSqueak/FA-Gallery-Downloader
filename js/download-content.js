import { waitFor, log, logLast } from './utils.js';
import { faRequestHeaders } from './login.js';
import * as db from './database-interface.js';
import fs from 'fs-extra';
import got from 'got';

const id = 'download-status';
const downloadDir = './downloaded_content';

/**
 * Handles the actual download and progress update for file saving.
 * @param {Object} results Results of a db query
 * @param {String} results.content_url
 * @param {String} results.content_name
 * @returns 
 */
function downloadSetup({ content_url, content_name }) {
  return new Promise((resolve, reject) => {
    const dl = got.stream(content_url, faRequestHeaders);
    const flStream = fs.createWriteStream(`${downloadDir}/${content_name}`);
    dl.on("downloadProgress", ({ transferred, total, percent }) => {
      const percentage = Math.round(percent * 100);
      logLast(`<progress value="${transferred}" max="${total}"></progress> ${percentage}%`, id);
      // logLast(`progress: ${transferred}/${total} (${percentage}%)`, id);
    })
    .on("error", (error) => {
      console.error(`Download failed: ${error.message}`);
      reject();
    });

    flStream.on("error", (error) => {
        console.error(`Could not write file to system: ${error.message}`);
        reject();
      })
      .on("finish", () => {
        logLast(`File "${content_name}" downloaded!`, id);
        resolve();
      });
    dl.pipe(flStream);
  });
}

/**
 * Gets the next content_url to download and records when it's finally saved.
 * @returns 
 */
async function startNextDownload() {
  const contentInfo = await db.getNextUnsavedContent();
  if (!contentInfo) return;
  console.log(contentInfo);
  await downloadSetup(contentInfo)
    .then(() => db.contentSaved(contentInfo.content_url));
  await waitFor(2000);
  startNextDownload();
}
/**
 * Starts the download loop for all content.
 * @returns 
 */
export async function initDownloads() {
  fs.ensureDirSync(downloadDir);
  log('Starting downloads...', id);
  await waitFor(1000);
  return startNextDownload();
}
