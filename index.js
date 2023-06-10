import { init as initUtils, log, logLast, __dirname, getHTML, stop, passUsername, passSearchName, passStartupInfo, getVersion, hideConsole, getPromise } from './js/utils.js';
import * as db from './js/database-interface.js';
import { FA_URL_BASE, DEFAULT_BROWSER_PARAMS, FA_USER_BASE, BROWSER_DIR, IGNORE_DEFAULT_PARAMS, DOWNLOADED_BROWSER_DIR } from './js/constants.js';
import { checkIfLoggedIn, handleLogin, forceNewLogin, username } from './js/login.js';
import { getSubmissionLinks, scrapeSubmissionInfo } from './js/scrape-data.js';
import { cleanupFileStructure, initDownloads } from './js/download-content.js';
import { initGallery } from './js/view-gallery.js';
import { getChromePath, getChromiumPath, getEdgePath } from 'browser-paths';
import * as cliProgress from 'cli-progress';
import fs from 'fs-extra';
import path from 'node:path';
import { join } from 'node:path';
import open from 'open';
import puppeteer from 'puppeteer-extra';
import * as pBrowsers from '@puppeteer/browsers';
import adBlocker from 'puppeteer-extra-plugin-adblocker';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

const startupLink = join('file://', __dirname, './html/startup.html');

// Puppeteer setup
puppeteer.use(adBlocker({ blockTrackers: true }));
puppeteer.use(stealthPlugin());
/**
 *  Get the browser info to load. Helps ensure we always get the same browser,
 *  even with updates.
 * @returns 
 */
async function getBrowserInfo() {
  const { latest_browser_version: browserVersion } = await db.getUserSettings();
  const os = pBrowsers.detectBrowserPlatform();
  const browser = pBrowsers.Browser.CHROME;
  let buildId = browserVersion;
  const cacheDir = path.resolve(DOWNLOADED_BROWSER_DIR);
  let buildPath = pBrowsers.computeExecutablePath({ browser, buildId, cacheDir});
  // If buildPath does not exist, we need a new one
  if(!fs.existsSync(buildPath)) {
    buildId = await pBrowsers.resolveBuildId(browser, os, pBrowsers.ChromeReleaseChannel.STABLE);
    buildPath = pBrowsers.computeExecutablePath({ browser, buildId, cacheDir});
    await db.saveUserSettings({ latest_browser_version: buildId });
  }
  return { browser, buildId, cacheDir, buildPath };
}
/**
 * Find the path to a browser executable to use for Puppeteer
 * @returns 
 */
async function getBrowserPath() {
  const product = 'chrome';
  let chromePath = await getPromise(getChromiumPath).catch(() => getPromise(getChromePath)).catch(() => '');
  if (!chromePath) {
    // We'll have to download one...
    const { browser, buildId, cacheDir, buildPath } = await getBrowserInfo();
    chromePath = buildPath;
    if (!fs.existsSync(chromePath)) {
      console.log('[Warn] No compatible browser found!');
      const dlBar = new cliProgress.SingleBar({
        format: 'Downloading compatible browser... | {bar} | {percentage}% | {value}/{total}',
      }, cliProgress.Presets.legacy);
      dlBar.start(100, 0);
      const downloadProgressCallback = (dl, total) => { 
        dlBar.update(Math.floor(dl/total * 100));
      };
      await pBrowsers.install({ browser, buildId, cacheDir, downloadProgressCallback });
      dlBar.stop();
    }
  }
  return { chromePath, product };
}

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
    ignoreDefaultArgs: IGNORE_DEFAULT_PARAMS,
  };
  fs.ensureDirSync(BROWSER_DIR + product);
  const browser = await puppeteer.launch(opts);
  let page = await browser.pages().then(p => p[0]);
  page.setDefaultNavigationTimeout(0);
  // Close program when main page is closed
  page.on('close', () => {
    process.exit(1);
  });
  // Display startup page
  return { browser, page };
}
let inProgress = false;
async function downloadPath(name = username, scrapeGallery = true, scrapeComments = true, scrapeFavorites) {
  if (inProgress) return log('[Data] Program already running!');
  if (name) {
    inProgress = true;
    const FA_GALLERY_URL = `${FA_URL_BASE}/gallery/${name}/`;
    const FA_SCRAPS_URL = `${FA_URL_BASE}/scraps/${name}/`;
    const FA_FAVORITES_URL = `${FA_URL_BASE}/favorites/${name}/`;

    // Check if valid username
    const $ = await getHTML(FA_USER_BASE + name);
    if (/system.error/i.test($('title').text())) {
      return log(`[Warn] Invalid username: ${name}`);
    }
    // Scrape data from gallery pages
    if (scrapeGallery) {
      await getSubmissionLinks({ url: FA_GALLERY_URL });
      await getSubmissionLinks({ url: FA_SCRAPS_URL, isScraps: true });
    }
    if (scrapeFavorites) await getSubmissionLinks({ url: FA_FAVORITES_URL, isFavorites: true, username: name });
  } else {
    log('[Data] Continuing previous download...');
  }
  // Scrape data from collected submission pages
  Promise.all([
    scrapeSubmissionInfo(null, scrapeComments),
    initDownloads(name),
  ]).then(() => {
    if(!stop.now) log('Requested downloads complete! ♥');
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
  await cleanupFileStructure();
}

async function init() {
  // Init database
  await db.init();
  const { page, browser } = await setupBrowser();
  // Setup user logging
  await initUtils(page);
  // Hide console on Windows
  hideConsole();
  // Wait for path decision
  await page.exposeFunction('userPath', async ({ choice, name, scrapeGallery, scrapeComments, scrapeFavorites, url }) => {
    stop.reset();
    if (choice === 'login') {
      if (!username) await handleLogin(browser);
      else await forceNewLogin(browser);
      await passUsername();
      await passSearchName(username);
    } else if (choice === 'start-download') {
      if (!username) await handleLogin(browser);
      await passUsername();
      downloadPath(name, scrapeGallery, scrapeComments, scrapeFavorites);
    } else if (choice === 'view-gallery') {
      log(`[Data] Opening gallery viewer...`);
      initGallery(browser);
    } else if (choice === 'stop-all') {
      stop.now = true;
      log('Stopping data scraping...');
    } else if(choice === 'open') {
      if (url) open(url);
    }
  });
  page.on('domcontentloaded', async () => {
    await passUsername();
    let accounts = await db.getOwnedAccounts();
    const data = {
      accounts: accounts.map(a => a.username),
      current: getVersion(),
    };
    let $ = await getHTML('https://github.com/SpottedSqueak/FA-Gallery-Downloader/commits/main', false);
    if ($) {
      const latest = $('.js-commits-list-item a.markdown-title').filter(function () {
        return /v?\d+.\d+.\d+/gi.test($(this).text());
      }).first().text();
      data.latest = latest;
    }
    await passStartupInfo(data);
  });
  await page.goto(startupLink);
  if (await checkIfLoggedIn(page)) await passUsername();
  // Repair DB if needed
  await checkDBRepair();
}

init();
