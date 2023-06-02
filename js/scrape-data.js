import { FA_URL_BASE } from './constants.js';
import * as db from './database-interface.js';
import { log, logLast, waitFor, getHTML } from './utils.js';

const scrapeID = 'scrape-div';
/**
 * Walks the user's gallery in order to gather all submission links for future download.
 * @param {String} url Gallery URL
 * @param {Boolean} isScraps Is this the scraps folder or not?
 */
export async function getSubmissionLinks(url, isScraps = false) {
  const divID = `${scrapeID}${isScraps ? '-scraps':''}`;
  let currPageCount = 1;
  let currLinks = 0;
  let stopLoop = false;
  log('Starting up metadata scraper...', divID);
  while(!stopLoop) {
    logLast(`Querying Page ${currPageCount}/??...`, divID);
    let $ = await getHTML(url + currPageCount);
    let newLinks = Array.from($('#gallery-gallery u > a'))
      .map((div) => FA_URL_BASE + div.attribs.href);
    if (!newLinks.length) {
      logLast(`Queried ${currPageCount}/${currPageCount} pages!`, divID);
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

const metadataID = 'scrape-metadata';
/**
 * Gathers all of the relevant metadata from all uncrawled submission pages.
 * @returns 
 */
export async function scrapeSubmissionInfo() {
  const links = await db.getSubmissionLinks();
  if (!links.length) return;
  log(`Saving metadata for: 0/${links.length}...`, metadataID);
  let index = 0;
  while (index < links.length) {
    logLast(`Saving metadata for: ${index+1}/${links.length} pages...`, metadataID);
    let $ = await getHTML(links[index].url);
    const data = {
      id: links[index].url.split('view/')[1].split('/')[0],
      title: $('.submission-title').text().trim(),
      desc: $('.submission-description').html().trim(),
      tags: $('.tags-row').text().match(/([A-Z])\w+/gmi)?.join(','),
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
