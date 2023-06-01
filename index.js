import * as db from './js/database-interface.js';
import { init as initUtil, log } from './js/utils.js';
import { FA_URL_BASE } from './js/constants.js';
import { loginLogic, username } from './js/login.js';
import { getLinks, scrapeSubmissionInfo } from './js/scrape-data.js';
import { getChromePath, getChromiumPath, getFirefoxPath } from 'browser-paths';
import puppeteer from 'puppeteer-core';
import fs from 'fs-extra';

// Find a browser to use!
const chromePath = await getChromiumPath() || await getChromePath();
const firefoxPath = await getFirefoxPath();
const product = (!chromePath) ? 'firefox':'chrome';

let page = null;

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
  page = await browser.pages();
  page = page[0];
  // Close everything when main page is closed
  page.on('close', () => {
    process.exit(1);
  });
}

// Init database
await db.init();

await setupBrowser();
// Setup user logging
initUtil(page);
await loginLogic(page);

const FA_GALLERY_URL = `${FA_URL_BASE}/gallery/${username}/`;
const FA_SCRAPS_URL = `${FA_URL_BASE}/scraps/${username}/`;

log('Gathering submission links from gallery pages...');
//let galleryLinks = await getLinks(bgPage, FA_GALLERY_URL);
//log(`${galleryLinks.length} Links found!`);
//await db.saveLinks(galleryLinks, false);

log('Gathering submission links from scrap pages...');
await getLinks(FA_SCRAPS_URL, true);


// Loop through links
await scrapeSubmissionInfo(false);
await scrapeSubmissionInfo(true);

console.log(await db.getAllData());
  // Queue up content download
