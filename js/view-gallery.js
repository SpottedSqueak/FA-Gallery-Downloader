import { __dirname } from './utils.js';
import * as db from './database-interface.js';
import { join } from 'path';
import { scrapeComments } from './scrape-data.js';
import { downloadSpecificContent } from './download-content.js';

const galleryLink = join('file://', __dirname, './html/gallery.html');
const contentPath = join('file://', __dirname, 'fa_gallery_downloader/downloaded_content');

let page = null;

export async function initGallery(browser) {
  page = await browser.newPage();
  await page.exposeFunction('getGalleryPage', async (offset, count, searchTerm) => {
    // Get all data for given gallery page using offset
    const data = await db.getGalleryPage(offset, count, searchTerm);
    return data;
  });
  await page.exposeFunction('getSubmissionPage', async (id) => {
    // Get all data for given submission page
    const data = await db.getSubmissionPage(id);
    return data;
  });
  await page.exposeFunction('downloadComments', async (id, url) => {
    const isComplete = await scrapeComments(null, id, url);
    return !!isComplete;
  });
  await page.exposeFunction('downloadContent', async (url, name) => {
    const isComplete = await downloadSpecificContent(url, name);
    return !!isComplete;
  });
  await page.exposeFunction('getContentPath', () => contentPath);
  await page.goto(galleryLink);
  page.on('console', msg => {
    const text = msg.text();
    if(/you are running/i.test(text)) return;
    console.log(`[gallery] ${text}`);
  });
}
