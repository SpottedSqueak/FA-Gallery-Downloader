import { init as initUtils, log, logLast, __dirname, getHTML, stop, passUsername, passSearchName, passStartupInfo, getVersion, hideConsole } from './js/utils.js';
import * as db from './js/database-interface.js';
import { FA_URL_BASE, FA_USER_BASE } from './js/constants.js';
import { checkIfLoggedIn, handleLogin, forceNewLogin, username } from './js/login.js';
import { getSubmissionLinks, scrapeSubmissionInfo } from './js/scrape-data.js';
import { cleanupFileStructure, initDownloads } from './js/download-content.js';
import { initGallery } from './js/view-gallery.js';
import { join } from 'node:path';
import open from 'open';
import { setupBrowser } from './js/setup-browsers.js';

const startupLink = join('file://', __dirname, './html/startup.html');

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
  const needsRepair = await db.needsRepair();
  if (needsRepair.length)
    log(`[Data] Database in need of repair!  ${needsRepair.length} submissions have incomplete data.`);
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
    } else if (choice === 'open') {
      if (url) open(url);
    } else if (choice === 'repair') {
      log('[Data] Checking database...');
      const inNeedOfRepair = await db.needsRepair();
      if (inNeedOfRepair.length) {
        logLast('Database incomplete! Working on that now...');
        await scrapeSubmissionInfo(inNeedOfRepair);
        if (!stop.now) logLast(`Database repaired!`);
      } else logLast(`Database OK!`);
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
  if (await checkIfLoggedIn(page)) await passUsername();
  await page.goto(startupLink);
  // Repair DB if needed
  await checkDBRepair();
}

init();
