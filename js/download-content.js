import { waitFor, log, logProgress } from './utils.js';
import { faRequestHeaders } from './login.js';
import * as db from './database-interface.js';
import fs from 'fs-extra';
import got from 'got';
import process from 'node:process';

const id = 'file-progress-bar';
const downloadDir = './fa_gallery_downloader/downloaded_content';
let stop = false;

function shouldStop() {
  return process.exitCode || stop;
}
export function stopDownloads() {
  stop = true;
}
/**
 * Handles the actual download and progress update for file saving.
 * @param {Object} results Results of a db query
 * @param {String} results.content_url
 * @param {String} results.content_name
 * @returns 
 */
function downloadSetup(content_url, content_name) {
  return new Promise((resolve, reject) => {
    const dl = got.stream(content_url, faRequestHeaders);
    const flStream = fs.createWriteStream(`${downloadDir}/${content_name}`);
    dl.on("downloadProgress", ({ transferred, total, percent }) => {
      const percentage = Math.round(percent * 100);
      logProgress({ transferred, total, percentage }, id);
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
        log(`[File] Downloaded: "${content_name}"`, id);
        resolve();
      });
    dl.pipe(flStream);
  });
}

export async function downloadSpecificContent(content_url, content_name) {
  await downloadSetup(content_url, content_name);
  return db.setContentSaved(content_url);
}
/**
 * Gets the next content_url to download and records when it's finally saved.
 * @returns 
 */
async function startNextDownload(name) {
  if (shouldStop()) return;
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
  stop = false;
  fs.ensureDirSync(downloadDir);
  await waitFor(5000);
  log('[File] Starting downloads...', id);
  return startNextDownload(name);
}
