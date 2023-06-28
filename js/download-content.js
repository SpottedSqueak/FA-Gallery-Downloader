import random from 'random';
import { waitFor, log, logProgress, stop, getHTML, urlExists } from './utils.js';
import { faRequestHeaders } from './login.js';
import * as db from './database-interface.js';
import fs from 'fs-extra';
import got from 'got';
import { DOWNLOAD_DIR as downloadDir } from './constants.js';

const progressID = 'file';
let thumbnailsRunning = false;
let totalThumbnails = 0;
let totalFiles = 0;
let currFile = 0;
let currThumbnail = 0;

function resetTotals() {
  totalThumbnails = 0;
  totalFiles = 0;
  currFile = 0;
  currThumbnail = 0;
  logProgress({ filename: '', reset: true }, progressID);
}
function getTotals() {
  if (!totalFiles && !totalThumbnails)
    return '';
  return `[${currFile + currThumbnail}/${totalFiles + totalThumbnails}]`
}
/**
 * Handles the actual download and progress update for file saving.
 * @param {Object} results Results of a db query
 * @param {String} results.content_url
 * @param {String} results.content_name
 * @returns 
 */
async function downloadSetup({ content_url, content_name, downloadLocation }) {
  // Check to see if this file even exists by checking the header response
  if (await urlExists(content_url)) {
    return new Promise((resolve, reject) => {
      fs.ensureDirSync(downloadLocation);
      const fileLocation = `${downloadLocation}/${content_name}`;
      const dlStream = got.stream(content_url, faRequestHeaders);
      const fStream = fs.createWriteStream(fileLocation);
      dlStream.on("downloadProgress", ({ transferred, total, percent }) => {
        const percentage = Math.round(percent * 100);
        logProgress({ transferred, total, percentage, filename: getTotals() }, progressID);
      })
      .on("error", (error) => {
        logProgress.reset(progressID);
        console.error(`Download failed: ${error.message} for ${content_name}`);
        fs.removeSync(fileLocation);
        reject();
      });

      fStream.on("error", (error) => {
          logProgress.reset(progressID);
          console.error(`Could not write file '${content_name}' to system: ${error.message}`);
          fs.removeSync(fileLocation);
          reject();
        })
        .on("finish", () => {
          // log(`[File] Downloaded: "${content_name}"`, progressID);
          resolve();
        });
      dlStream.pipe(fStream);
    });
  } else {
    console.warn(`File '${content_name} does not exist!`);
    return false;
  }
}

export async function cleanupFileStructure() {
  const content = await db.getAllUnmovedContentData();
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

/**
 * Downloads the specified content.
 * @returns 
 */
export async function downloadSpecificContent({ content_url, content_name, username }) {
  if (stop.now) return;
  const downloadLocation = `${downloadDir}/${username}`;
  return downloadSetup({ content_url, content_name, downloadLocation })
    .then(() => db.setContentSaved(content_url))
    .catch(() => {/** No need to record, just ignore */});
}
/**
 * Downloads the specified thumbnail.
 * @returns 
 */
export async function downloadThumbnail({ thumbnail_url, url:contentUrl, username }) {
  if (stop.now) return;
  let content_url = thumbnail_url || '';
  // If blank...
  if (!content_url) {
    // Query the page to get it
    const $ = await getHTML(contentUrl);
    content_url = $('.page-content-type-text, .page-content-type-music').find('#submissionImg').attr('src') || '';
    if (content_url) content_url = 'https:' + content_url;
  }
  if (!content_url) return;
  const content_name = content_url.split('/').pop();
  const downloadLocation = `${downloadDir}/${username}/thumbnail`;
  return downloadSetup({ content_url, content_name, downloadLocation })
    .then((fileSaved) => {
      if (fileSaved === false) return db.setThumbnailSaved(contentUrl, '', '');
      return db.setThumbnailSaved(contentUrl, content_url, content_name);
    })
    .catch(() => {/** No need to record, just ignore */});
}
/**
 * Gets all download urls and records when they're done.
 * @returns 
 */
async function startContentDownloads(name) {
  if (stop.now) return;
  let data = await db.getAllUnsavedContent(name);
  if (!data.length) data = await db.getAllUnsavedContent();
  if (!data.length) return;
  totalFiles = data.length;
  currFile = 1;
  let i = 0;
  while (i < data.length) {
    if (stop.now) return;
    await downloadSpecificContent(data[i]);
    if (!thumbnailsRunning) startThumbnailDownloads();
    await waitFor(random.int(2000, 4000));
    i++;
    currFile = i + 1;
  }
  await waitFor(random.int(2000, 4000));
  return startContentDownloads(name);
}
export async function startUserContentDownloads(data) {
  totalFiles = data.length;
  currFile = 1;
  let i = 0;
  while (i < data.length) {
    if (stop.now) break;
    await downloadSpecificContent(data[i]);
    await waitFor(random.int(2000, 4000));
    i++;
    currFile = i + 1;
  }
  await waitFor();
  resetTotals();
}
async function startThumbnailDownloads() {
  if (stop.now) return thumbnailsRunning = false;
  thumbnailsRunning = true;
  const data = await db.getAllUnsavedThumbnails();
  if (!data.length) return thumbnailsRunning = false;
  totalThumbnails = data.length;
  currThumbnail = 1;
  let i = 0;
  while (i < data.length) {
    if (stop.now) return thumbnailsRunning = false;
    await downloadThumbnail(data[i]);
    await waitFor(random.int(1000, 2500));
    i++;
    currThumbnail = i + 1;
  }
  await waitFor(random.int(2000, 3500));
  return startThumbnailDownloads();
}

async function startAllDownloads(name) {
  await Promise.all([
    startContentDownloads(name),
    startThumbnailDownloads(),
  ]);
  resetTotals();
  return;
}
/**
 * Starts the download loop for all content.
 * @returns 
 */
export async function initDownloads(name) {
  resetTotals();
  fs.ensureDirSync(downloadDir);
  await waitFor(5000);
  if (stop.now) return;
  log('[File] Starting downloads...', progressID);
  return startAllDownloads(name);
}
