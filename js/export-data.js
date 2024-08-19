import { join } from 'node:path';
import fs from 'fs-extra';
import { scrapeSubmissionInfo } from './scrape-data.js';
import { startUserContentDownloads } from './download-content.js';
import { DOWNLOAD_DIR, EXPORT_DIR } from './constants.js';
import { stop } from './utils.js';
import * as db from './database-interface.js'

const dlOptions = {
  mode: fs.constants.S_IRWXO
};

function constructJSON(d, includeDate = true) {
  return JSON.stringify({
    type: (/(png|jpg|gif|webp|jpeg)$/i.test(d.content_name)) ? 'image':'other',
    title: d.title || '',
    date: includeDate ? new Intl.DateTimeFormat('en').format(new Date(d.date_uploaded)): '',
    description: d.desc || '',
    tags: d.tags?.split(',') || [],
    rating: d.rating || 'General',
  });
}
async function exportData(name, includeDate) {
  name = name.toLowerCase();
  const dirPath = join(EXPORT_DIR, name);
  const inNeedOfRepair = await db.needsRepair(name);
  const needsDownload = await db.getAllUnsavedContent(name);
  if (inNeedOfRepair.length) 
    console.log(`[Data] Missing submission data for ${inNeedOfRepair.length} submissions...`);
  if (needsDownload.length)
    console.log(`[File] Missing submission content for ${needsDownload.length} submissions...`);
  if (stop.now) return console.log(`[Data] User account export aborted`);
  await Promise.all([
    scrapeSubmissionInfo({ data: inNeedOfRepair, downloadComments: false }),
    startUserContentDownloads(needsDownload)
  ]);
  if (stop.now) return console.log(`[Data] User account export aborted`);
  const allUserData = await db.getAllSubmissionsForUser(name);
  if (!allUserData.length) return console.log(`[Data] No submissions to export: ${name}`);
  console.log(`[Data] Exporting ${allUserData.length} submissions for account: ${name}`);
  // Delete old exports!
  await fs.emptyDir(dirPath);
  // Loop through submissions and export them to Postybirb importer format
  let folderIndex = 0;
  let data, src, dest, archiveFileName, jsonFileName;
  for(let i = 0; i < allUserData.length; i++) {
    // Loop through 50 submissions...
    if (i%50 === 0) {
      folderIndex++;
      await fs.ensureDir(join(dirPath, `${folderIndex}`, 'scraps'), dlOptions);
      await fs.ensureDir(join(dirPath, `${folderIndex}`, 'gallery'), dlOptions);
      await fs.ensureFile(join(dirPath, `${folderIndex}`, `archive.chunk`));
    }
    data = allUserData[i];
    archiveFileName = `${data.id}f.${data.content_name.split('.').pop()}`;
    jsonFileName = `${data.id}d.json`;
    src = join(DOWNLOAD_DIR, name, data.content_name);
    dest = join(dirPath, `${folderIndex}`, (data.is_scrap) ? 'scraps':'gallery');
    await fs.copy(src, join(dest, archiveFileName));
    await fs.writeFile(join(dest, jsonFileName), constructJSON(data, includeDate));
    if (data.is_thumbnail_saved) {
      archiveFileName = archiveFileName.split('f.')[0] + 't.' + data.thumbnail_name.split('.').pop();
      src = join(DOWNLOAD_DIR, name, 'thumbnail', data.thumbnail_name);
      dest = join(dirPath, `${folderIndex}`, (data.is_scrap) ? 'scraps':'gallery');
      await fs.copy(src, join(dest, archiveFileName));
    }
  }
  console.log(`[Data] Export complete! Files can be found under "${dirPath}"`);
}
let inProgress = false;
export async function init(name, includeDate) {
  if (inProgress) return console.log('[Data] Already exporting data, please wait!');
  inProgress = true;
  await exportData(name, includeDate)
    .catch(e => {
      console.error(e);
      console.log(`[Error] Data export failed, check logs`);
    });
  inProgress = false;
}