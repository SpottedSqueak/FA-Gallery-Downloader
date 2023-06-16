import { getPromise } from './utils.js';
import * as db from './database-interface.js';
import { DEFAULT_BROWSER_PARAMS, BROWSER_DIR, IGNORE_DEFAULT_PARAMS, DOWNLOADED_BROWSER_DIR } from './constants.js';
import { getChromePath, getChromiumPath } from 'browser-paths';
import * as cliProgress from 'cli-progress';
import fs from 'fs-extra';
import path from 'node:path';
import puppeteer from 'puppeteer-extra';
import * as pBrowsers from '@puppeteer/browsers';
import adBlocker from 'puppeteer-extra-plugin-adblocker';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import process from 'node:process';

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
export async function setupBrowser() {
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
  page.on('close', async () => {
    await db.close();
    process.exit(1);
  });
  // Display startup page
  return { browser, page };
}