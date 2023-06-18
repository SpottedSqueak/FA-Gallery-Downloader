import { init as initUtils, log, logLast, __dirname, getHTML, stop, passUsername, passSearchName, passStartupInfo, getVersion, hideConsole } from './js/utils.js';
import * as db from './js/database-interface.js';
import { FA_URL_BASE, FA_USER_BASE, RELEASE_CHECK } from './js/constants.js';
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
    log(`[Data] Database in need of repair:  ${needsRepair.length} submissions have incomplete data.`);
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
  await page.exposeFunction('userPath', async (data) => {
    const { choice } = data;
    stop.reset();
    if (choice === 'login') {
      if (!username) await handleLogin(browser);
      else await forceNewLogin(browser);
      await passUsername();
      await passSearchName(username);
    } else if (choice === 'start-download') {
      if (!username) await handleLogin(browser);
      await passUsername();
      const { name, scrapeGallery, scrapeComments, scrapeFavorites } = data;
      downloadPath(name, scrapeGallery, scrapeComments, scrapeFavorites);
    } else if (choice === 'view-gallery') {
      log(`[Data] Opening gallery viewer...`);
      initGallery(browser);
    } else if (choice === 'stop-all') {
      stop.now = true;
      log('Stopping data scraping...');
    } else if (choice === 'open') {
      if (data.url) open(data.url);
    } else if (choice === 'repair') {
      log('[Data] Checking database...');
      if (inProgress)
        return log(`[Data] Please stop data scraping before restarting!`);
      inProgress = true;
      const inNeedOfRepair = await db.needsRepair();
      if (inNeedOfRepair.length) {
        logLast('Database incomplete! Working on that now...');
        await scrapeSubmissionInfo(inNeedOfRepair, true)
          .finally(() => inProgress = false);
        if (!stop.now) logLast(`Database repaired!`);
      } else logLast(`Database OK!`);
    } else if (choice === 'export-data') {
      const allUserData = await db.getAllSubmissionsForUser(data.name);
      log(`[#TODO] Exporting ${allUserData.length} submissions for account: ${data.name}`);
    }
  });
  page.on('domcontentloaded', async () => {
    await passUsername();
    let accounts = await db.getOwnedAccounts();
    const data = {
      accounts: accounts.map(a => a.username),
      current: getVersion(),
    };
    let $ = await getHTML(RELEASE_CHECK, false);
    if ($) {
      const latest = $('a.Link--primary').first().text().replace('v', '');
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
