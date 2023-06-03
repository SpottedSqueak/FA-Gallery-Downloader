import { __dirname } from './utils.js';
import * as db from './database-interface.js';
import { join } from 'path';
import fs from 'fs-extra';

const galleryHTML = fs.readFileSync(join(__dirname, './html/gallery.html'), 'utf8');
let page = null;

export async function initGallery(browser) {
  page = await browser.newPage();
  await page.setContent(galleryHTML);
  await page.exposeFunction('getGalleryPage', async (offset) => {
    // Get all data for given gallery page using offset
    const data = await db.getGalleryPage(offset);
  });
  await page.exposeFunction('getSubmissionPage', async (id) => {
    // Get all data for given submission page
    const data = await db.getSubmissionPage(id);
  });
  await page.exposeFunction('downloadContent', async (content_name) => {
    // Open tab to view content
  });
}
