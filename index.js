import { init as initUtils, log, logLast, __dirname, getHTML, stop, sendStartupInfo, hideConsole, releaseCheck, isSiteActive, setActive } from './js/utils.js';
import * as db from './js/database-interface.js';
import { FA_URL_BASE, FA_USER_BASE } from './js/constants.js';
import { checkIfLoggedIn, handleLogin, forceNewLogin, username, checkForOldTheme } from './js/login.js';
import { getSubmissionLinks, scrapeSubmissionInfo } from './js/scrape-data.js';
import { initDownloads } from './js/download-content.js';
import { initGallery } from './js/view-gallery.js';
import { join } from 'node:path';
import open from 'open';
import { setupBrowser } from './js/setup-browsers.js';
import { init as exportData } from './js/export-data.js';

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
    scrapeSubmissionInfo({ downloadComments: scrapeComments }),
    initDownloads(name),
  ]).then(() => {
    if(!stop.now) log('Requested downloads complete! ♥');
  }).finally(() => {
    inProgress = false;
    setActive(false);
  });
}

async function checkDBRepair() {
  const needsRepair = await db.needsRepair();
  if (needsRepair.length)
    log(`[Data] Database in need of repair:  ${needsRepair.length} submissions have incomplete data.`);
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
      if (!await checkIfLoggedIn(browser)) await handleLogin();
      else await forceNewLogin(browser);
      await checkForOldTheme();
      await sendStartupInfo({ queryName: username});
    } else if (choice === 'start-download') {
      if (!await checkIfLoggedIn(browser)) await handleLogin();
      await checkForOldTheme();
      await sendStartupInfo();
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
      if (inProgress)
        return log(`[Data] Please stop data scraping before restarting!`);
      log('[Data] Checking database...');
      inProgress = true;
      setActive(true);
      const inNeedOfRepair = await db.needsRepair();
      if (inNeedOfRepair.length) {
        logLast('Database incomplete! Working on that now...');
        await scrapeSubmissionInfo({ data: inNeedOfRepair, downloadComments: true })
          .finally(() => {
            inProgress = false;
            setActive(false);
          });
        if (!stop.now) logLast(`Database repaired!`);
      } else {
        inProgress = false;
        setActive(false);
        logLast(`Database OK!`);
      }
    } else if (choice === 'export-data') {
      setActive(true);
      await exportData(data.name);
      setActive(false);
    } else if (choice === 'release-check') {
      sendStartupInfo(await releaseCheck());
    }
  });
  page.on('domcontentloaded', async () => {
    await sendStartupInfo(await releaseCheck());
  });
  await page.goto(startupLink);
  const isFAUp = await isSiteActive();
  if (isFAUp && await checkIfLoggedIn(browser)) await sendStartupInfo();
  if (!isFAUp) log(`[Warn] FA appears to be down, try again later`);
  // Repair DB if needed
  await checkDBRepair();
}

init();
