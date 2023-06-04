import { FA_URL_BASE } from './constants.js';
import * as db from './database-interface.js';
import { log, logLast, waitFor, getHTML } from './utils.js';
import process from 'node:process';

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
    if (process.exitCode) return;
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
export async function scrapeComments($, submission_id, url) {
  $ = $ || await getHTML(url);
  const comments = Array.from($('#comments-submission .comment_container'))
    .map((val) => {
      const $div = $(val);
      const isDeleted = $div.find('comment-container').hasClass('deleted-comment-container');
      return {
        id: $div.find('.comment_anchor').attr('id'),
        submission_id,
        width: $div.attr('style'),
        username: isDeleted ? '' : $div.find('comment-username').text().trim(),
        desc: isDeleted ? '' : $div.find('comment-user-text .user-submitted-links').html().trim(),
        subtitle: isDeleted ? '' : $div.find('comment-title').text().trim(),
        date: isDeleted ? '' : $div.find('comment-date > span').attr('title'),
      }
    });
  await db.saveComments(comments);
}
const metadataID = 'scrape-metadata';
/**
 * Gathers all of the relevant metadata from all uncrawled submission pages.
 * @returns 
 */
export async function scrapeSubmissionInfo(data = null, downloadComments) {
  const links = data || await db.getSubmissionLinks();
  if (!links.length) return;
  log(`Saving metadata...`, metadataID);
  let index = 0;
  while (index < links.length) {
    if (process.exitCode) return;
    logLast(`Saving metadata for: ${index+1}/${links.length} pages...`, metadataID);
    let $ = await getHTML(links[index].url);
    // Check if submission still exists
    if (!$ || !$('.submission-title').length) return;
    // Get data if it does
    const data = {
      id: links[index].url.split('view/')[1].split('/')[0],
      title: $('.submission-title').text().trim(),
      username: $('.submission-title + a').text().trim().toLowerCase(),
      desc: $('.submission-description').html().trim(),
      tags: $('.tags-row').text().match(/([A-Z])\w+/gmi)?.join(','),
      content_name: $('.download > a').attr('href').split('/').pop(),
      content_url: $('.download > a').attr('href'),
      date_uploaded: $('.submission-id-sub-container .popup_date').attr('title'),
    };
    // Test to fix FA url weirdness
    if (!/^https/i.test(data.content_url)) data.content_url = 'https:' + data.content_url;
    // Save data to db
    await db.saveMetaData(links[index].url, data);
    // Save comments
    if (downloadComments) await scrapeComments($, data.id);
    index++;
    if (index % 2) await waitFor(1000);
  }
  log('Save complete!');
}
