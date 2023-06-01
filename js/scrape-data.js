import { FA_URL_BASE } from './constants.js';
import * as db from './database-interface.js';
import { log, logLast, waitFor, getHTML } from './utils.js';

export async function getLinks(url, isScraps = false) {
  let currPageCount = 1;
  let currLinks = 0;
  let stopLoop = false;
  log('Starting up metadata scraper...', 'scrape-div');
  while(!stopLoop) {
    logLast(`Querying Page ${currPageCount}/??...`, 'scrape-div');
    let $ = await getHTML(url + currPageCount);
    let newLinks = Array.from($('#gallery-gallery u > a'))
      .map((div) => FA_URL_BASE + div.attribs.href);
    if (!newLinks.length) {
      logLast(`Queried ${currPageCount}/${currPageCount} pages!`, 'scrape-div');
      break;
    }
    await db.saveLinks(newLinks, isScraps).catch(() => stopLoop = true);
    if (stopLoop) {
      log('Data stopped early!');
      break;
    }
    currLinks = currLinks += newLinks.length;
    currPageCount++;
    await waitFor();
  }
  log(`${currLinks} submissions found!`);
}

export async function scrapeSubmissionInfo() {
  const links = await db.getSubmissionLinks();
  if (!links.length) return;
  log(`Saving metadata for: 0/${links.length}...`, 'scrape-metadata');
  let index = 0;
  while (index < links.length) {
    logLast(`Saving metadata for: ${index+1}/${links.length} pages...`, 'scrape-metadata');
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
    // Test to fix FA weirdness
    if (!/^https/i.test(data.content_url)) data.content_url = 'https:' + data.content_url;
    await db.saveMetaData(links[index].url, data);
    index++;
    if (index % 2) await waitFor();
  }
  log('Save complete!');
}
