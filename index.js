import * as db from './js/database-interface.js';
import { init as initUtils, log } from './js/utils.js';
import { FA_URL_BASE } from './js/constants.js';
import { handleLogin, username } from './js/login.js';
import { getLinks, scrapeSubmissionInfo } from './js/scrape-data.js';
import { initDownloads } from './js/download-content.js';
import { getChromePath, getChromiumPath, getFirefoxPath } from 'browser-paths';
import puppeteer from 'puppeteer-core';
import fs from 'fs-extra';

// Find a browser to use!
const chromePath = await getChromiumPath() || await getChromePath();
const firefoxPath = await getFirefoxPath();
const product = (!chromePath) ? 'firefox':'chrome';

async function setupBrowser() {
  const opts = {
    headless: false,
    executablePath: chromePath || firefoxPath,
    product,
    args: (product === 'firefox') ? ['--profile-directory="Profile 1"', '--window-size=1024,700', '-no-remote'] : ['--app=data:text/html, Loading...', '--window-size=1024,700'],
    userDataDir: './myUserDataDir/' + product,
    defaultViewport: null,
  };
  fs.ensureDirSync('./myUserDataDir/' + product);
  const browser = await puppeteer.launch(opts);
  let page = await browser.pages();
  page = page[0];
  // Close everything when main page is closed
  page.on('close', () => {
    process.exit(1);
  });
  return page;
}

// Init database
await db.init();

const page = await setupBrowser();
// Setup user logging
initUtils(page);
await handleLogin(page);

// Need to handle login before getting username
const FA_GALLERY_URL = `${FA_URL_BASE}/gallery/${username}/`;
const FA_SCRAPS_URL = `${FA_URL_BASE}/scraps/${username}/`;

// Scrape data from gallery pages
log('Gathering submission links from gallery pages...');
await getLinks(FA_GALLERY_URL, false);
log('Gathering submission links from scrap pages...');
await getLinks(FA_SCRAPS_URL, true);
// Scrape data from collected submission pages
Promise.all([
  scrapeSubmissionInfo(),
  initDownloads(),
]).then(() => {
  log('Everything downloaded from your gallery! ♥');
});
