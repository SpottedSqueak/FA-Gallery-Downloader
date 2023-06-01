import { FA_URL_BASE } from './constants.js';
import * as db from './database-interface.js';
import { log, logLast, waitFor, getHTML } from './utils.js';
import got from 'got';


export async function getLinks(url, isScraps = false) {
  let currPageCount = 1;
  let currLinks = 0;
  log('Staring up...');
  while(currLinks >= 0) {
    logLast(`Querying Page ${currPageCount}/??...`);
    let $ = await getHTML(url + currPageCount);
    let newLinks = Array.from($('#gallery-gallery u > a'))
      .map((div) => FA_URL_BASE + div.attribs.href);
    if (!newLinks.length) {
      logLast(`Queried ${currPageCount}/${currPageCount} pages!`);
      break;
    }
    await db.saveLinks(newLinks, isScraps);
    currLinks = currLinks += newLinks.length;
    currPageCount++;
    await waitFor();
  }
  log(`${currLinks} submissions found!`);
}

export async function scrapeSubmissionInfo(isScraps = false) {
  const links = await db.getSubmissionLinks(isScraps);
  if (!links.length) return;
  log(`Saving metadata for: 0/${links.length}...`);
  let index = 0;
  while (index < links.length) {
    logLast(`Saving metadata for: ${index+1}/${links.length} pages...`);
    //await navigate(bgPage, links[index].url);
    let $ = await getHTML(links[index].url);
    const data = {
      id: links[index].url.split('view/')[1].split('/')[0],
      title: $('.submission-title').text().trim(),
      desc: $('.submission-description').text().trim(),
      tags: $('.tags-row').text().match(/([A-Z])\w+/gmi).join(','),
      content_name: $('.download > a').attr('href').split('/').pop(),
      content_url: $('.download > a').attr('href'),
      date_uploaded: $('.submission-id-sub-container .popup_date').attr('title'),
    };
    await db.saveMetaData(links[index].url, data);
    index++;
    if (index % 2) await waitFor();
  }
  log('Save complete!');
}
