import * as db from './js/database-interface.js';
import { init as initUtils, log, logLast, __dirname } from './js/utils.js';
import { FA_URL_BASE } from './js/constants.js';
import { handleLogin, username } from './js/login.js';
import { getSubmissionLinks, scrapeSubmissionInfo } from './js/scrape-data.js';
import { initDownloads } from './js/download-content.js';
import { initGallery } from './js/view-gallery.js';
import { getChromePath, getChromiumPath, getFirefoxPath } from 'browser-paths';
import puppeteer from 'puppeteer-core';
import fs from 'fs-extra';
import { join } from 'path';
import { hideConsole } from 'node-hide-console-window';

const startupHTML = fs.readFileSync(join(__dirname, './html/startup.html'), 'utf8');

/**
 * Find the path to a browser executable to use for Puppeteer
 * @returns 
 */
async function getBrowserPath() {
  const chromePath = await getChromiumPath() || await getChromePath();
  const firefoxPath = (chromePath) ? '' : await getFirefoxPath();
  const product = (!chromePath) ? 'firefox':'chrome';
  return { chromePath, firefoxPath, product };
}

const BROWSER_DIR = './fa_gallery_downloader/browser_profiles/';
/**
 * Sets up the browser for use with Puppeteer
 * @returns 
 */
async function setupBrowser() {
  const { chromePath, firefoxPath, product } = await getBrowserPath();
  const opts = {
    headless: false,
    executablePath: chromePath || firefoxPath,
    product,
    args: (product === 'firefox') ? ['--profile-directory="Profile 1"', '--window-size=1024,700', '-no-remote'] : ['--app=data:text/html, Loading...', '--window-size=1024,700'],
    userDataDir: BROWSER_DIR + product,
    defaultViewport: null,
  };
  fs.ensureDirSync(BROWSER_DIR + product);
  const browser = await puppeteer.launch(opts);
  let page = await browser.pages();
  page = page[0];
  page.setDefaultNavigationTimeout(0);
  // Close program when main page is closed
  page.on('close', () => {
    process.exit(1);
  });
  // Display startup page
  await page.setContent(startupHTML);
  return { browser, page };
}

async function downloadPath() {
  const FA_GALLERY_URL = `${FA_URL_BASE}/gallery/${username}/`;
  const FA_SCRAPS_URL = `${FA_URL_BASE}/scraps/${username}/`;

  // Scrape data from gallery pages
  log('Gathering submission links from gallery pages...');
  await getSubmissionLinks(FA_GALLERY_URL, false);
  log('Gathering submission links from scrap pages...');
  await getSubmissionLinks(FA_SCRAPS_URL, true);
  // Scrape data from collected submission pages
  Promise.all([
    scrapeSubmissionInfo(),
    initDownloads(),
  ]).then(() => {
    log('Everything downloaded from your gallery! ♥');
  });
}

async function viewGalleryPath(browser) {
  // Pass off gallery view to that codebase
  initGallery(browser);
}

// Test
async function checkDBRepair() {
  log('Checking database...');
  const blankUserNames = await db.needsUsernames();
  if (blankUserNames.length) {
    logLast('Database in need of repair! Working on that now...');
    await scrapeSubmissionInfo(blankUserNames);
    logLast(`Database repaired!`);
  } else logLast(`Database OK!`);
}

async function init() {
  hideConsole();
  // Init database
  await db.init();
  const { page, browser } = await setupBrowser();
  // Setup user logging
  initUtils(page);
  await handleLogin(browser);
  // Wait for path decision
  await page.exposeFunction('userPath', (choice) => {
    if (choice === 'start-download')
      downloadPath();
    else if (choice === 'view-gallery')
      viewGalleryPath(browser);
  });
  // Repair DB if needed
  await checkDBRepair();
  // Enable user choice buttons
  await page.evaluate(`document.querySelectorAll('.user-choices > button')
  .forEach(div => div.disabled=false)`);
}

init();
