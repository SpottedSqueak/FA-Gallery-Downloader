import { init as initUtils, log, logLast, __dirname, getHTML } from './js/utils.js';
import * as db from './js/database-interface.js';
import { FA_URL_BASE, DEFAULT_BROWSER_PARAMS, FA_USER_BASE } from './js/constants.js';
import { handleLogin, username } from './js/login.js';
import { getSubmissionLinks, scrapeSubmissionInfo, stopData } from './js/scrape-data.js';
import { initDownloads, stopDownloads } from './js/download-content.js';
import { initGallery } from './js/view-gallery.js';
import { getChromePath, getChromiumPath } from 'browser-paths';
import puppeteer from 'puppeteer-core';
import * as pBrowsers from '@puppeteer/browsers';
import * as cliProgress from 'cli-progress';
import fs from 'fs-extra';
import { join } from 'node:path';
import { hideConsole } from 'node-hide-console-window';

const startupLink = join(__dirname, './html/startup.html');
const startupHTML = fs.readFileSync(join(__dirname, './html/startup.html'), 'utf8');

/**
 * Find the path to a browser executable to use for Puppeteer
 * @returns 
 */
async function getBrowserPath() {
  const product = 'chrome';
  let chromePath = await getChromiumPath() || await getChromePath();
  if (!chromePath) {
    // We'll have to download one...
    console.log('[Warn] No compatible browser found!');
    const os = pBrowsers.detectBrowserPlatform();
    const browser = pBrowsers.Browser.CHROME;
    const buildId = await pBrowsers.resolveBuildId(browser, os, pBrowsers.ChromeReleaseChannel.CANARY);
    const cacheDir = join(__dirname, './fa_gallery_downloader/downloaded_browser');
    const dlBar = new cliProgress.SingleBar({
      format: 'Downloading compatible browser... | {bar} | {percentage}% | {value}/{total}',
    }, cliProgress.Presets.legacy);
    dlBar.start(100, 0);
    const downloadProgressCallback = (dl, total) => { 
      dlBar.update(Math.floor(dl/total * 100));
    };
    await pBrowsers.install({ browser, buildId, cacheDir, downloadProgressCallback });
    chromePath = pBrowsers.computeExecutablePath({ browser, buildId, cacheDir});
    dlBar.stop();
  }
  return { chromePath, product };
}

const BROWSER_DIR = './fa_gallery_downloader/browser_profiles/';
/**
 * Sets up the browser for use with Puppeteer
 * @returns 
 */
async function setupBrowser() {
  const { chromePath, product } = await getBrowserPath();
  const opts = {
    headless: false,
    executablePath: chromePath,
    product,
    args: DEFAULT_BROWSER_PARAMS,
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
  //await page.setContent(startupHTML);
  await page.goto(startupLink);
  return { browser, page };
}
let inProgress = false;
async function downloadPath(name = username, scrapeComments) {
  inProgress = true;
  const FA_GALLERY_URL = `${FA_URL_BASE}/gallery/${name}/`;
  const FA_SCRAPS_URL = `${FA_URL_BASE}/scraps/${name}/`;

  // Check if valid username
  const $ = await getHTML(FA_USER_BASE + name);
  if (/system.error/i.test($('title').text())) {
    return log(`[Warn] Invalid username: ${name}`);
  }
  // Scrape data from gallery pages
  await getSubmissionLinks(FA_GALLERY_URL, false);
  await getSubmissionLinks(FA_SCRAPS_URL, true);
  // Scrape data from collected submission pages
  Promise.all([
    scrapeSubmissionInfo(null, scrapeComments),
    initDownloads(name),
  ]).then(() => {
    log('Everything downloaded from your gallery! ♥');
  }).finally(() => inProgress = false);
}

async function checkDBRepair() {
  log('[Data] Checking database...');
  const inNeedofRepairArr = await db.needsRepair();
  if (inNeedofRepairArr.length) {
    logLast('Database incomplete! Working on that now...');
    await scrapeSubmissionInfo(inNeedofRepairArr);
    logLast(`Database repaired!`);
  } else logLast(`Database OK!`);
}

async function init() {
  // Init database
  await db.init();
  const { page, browser } = await setupBrowser();
  hideConsole();
  // Setup user logging
  initUtils(page);
  // Wait for path decision
  await page.exposeFunction('userPath', (choice, name, scrapeComments = true) => {
    if (choice === 'start-download') {
      if (name) downloadPath(name, scrapeComments);
      else log('[Warn] Need a valid username first...');
    } else if (choice === 'view-gallery')
      initGallery(browser);
    else if (choice === 'stop-all') {
      // This is incomplete...Need a better way to do this...
      stopDownloads();
      stopData();
      log('Shutting down...');
    }
  });
  await handleLogin(browser);
  await page.evaluate(`window.setUsername('${username}')`);
  // Repair DB if needed
  await checkDBRepair();
  // Enable user choice buttons
  await page.evaluate(`document.querySelector('#start-download').disabled = false;`);
  // console.dir(await db.getAllSubmissionData());
}

init();
