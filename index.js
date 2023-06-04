import { init as initUtils, log, logLast, __dirname, getHTML } from './js/utils.js';
import * as db from './js/database-interface.js';
import { FA_URL_BASE, DEFAULT_BROWSER_PARAMS, FA_USER_BASE } from './js/constants.js';
import { handleLogin, username } from './js/login.js';
import { getSubmissionLinks, scrapeSubmissionInfo } from './js/scrape-data.js';
import { initDownloads } from './js/download-content.js';
import { initGallery } from './js/view-gallery.js';
import { getChromePath, getChromiumPath } from 'browser-paths';
import puppeteer from 'puppeteer-core';
import * as pBrowsers from '@puppeteer/browsers';
import * as cliProgress from 'cli-progress';
import fs from 'fs-extra';
import { join } from 'node:path';
import { hideConsole } from 'node-hide-console-window';

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
  await page.setContent(startupHTML);
  return { browser, page };
}

async function downloadPath(name = username, scrapeComments) {
  const FA_GALLERY_URL = `${FA_URL_BASE}/gallery/${name}/`;
  const FA_SCRAPS_URL = `${FA_URL_BASE}/scraps/${name}/`;

  // Check if valid username
  const $ = await getHTML(FA_USER_BASE + name);
  if (/system.error/i.test($('title').text())) {
    return log(`Invalid username: ${name}`);
  }
  // Scrape data from gallery pages
  log('Gathering submission links from gallery pages...');
  await getSubmissionLinks(FA_GALLERY_URL, false);
  log('Gathering submission links from scrap pages...');
  await getSubmissionLinks(FA_SCRAPS_URL, true);
  // Scrape data from collected submission pages
  Promise.all([
    scrapeSubmissionInfo(null, scrapeComments),
    initDownloads(),
  ]).then(() => {
    log('Everything downloaded from your gallery! ♥');
  });
}

async function checkDBRepair() {
  log('Checking database...');
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
      else log('Need a valid username first...');
    } else if (choice === 'view-gallery')
      initGallery(browser);
  });
  await handleLogin(browser);
  await page.evaluate(`window.setUsername('${username}')`);
  // Repair DB if needed
  await checkDBRepair();
  // Enable user choice buttons
  await page.evaluate(`document.querySelectorAll('.user-choices > button')
  .forEach(div => div.disabled=false)`);
  // console.dir(await db.getAllSubmissionData());
}

init();
