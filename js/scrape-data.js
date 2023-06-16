import { FA_URL_BASE } from './constants.js';
import * as db from './database-interface.js';
import { log, logProgress, waitFor, getHTML, stop } from './utils.js';

const scrapeID = 'scrape-div';
const progressID = 'data';

/**
 * Walks the user's gallery in order to gather all submission links for future download.
 * @param {String} url Gallery URL
 * @param {Boolean} isScraps Is this the scraps folder or not?
 */
export async function getSubmissionLinks({ url, username, isScraps = false, isFavorites = false }) {
  let dirName = (isFavorites) ? 'favorites': (isScraps) ? 'scraps' : 'gallery';
  const divID = `${scrapeID}${isScraps ? '-scraps':''}`;
  let currPageCount = 1;
  let currLinks = 0;
  let stopLoop = false;
  let nextPage = ''; // Only valid if in favorites!
  log(`[Data] Searching user ${dirName} for submission links...`, divID);
  logProgress.busy(progressID);
  while(!stopLoop && !stop.now) {
    let $ =  await getHTML((!nextPage) ? url + currPageCount : nextPage);
    // Check for content
    let newLinks = Array.from($('figcaption a[href^="/view"]'))
      .map((div) => FA_URL_BASE + div.attribs.href);
    if (!newLinks.length) {
      // log(`[Data] Found ${currPageCount} pages of submissions!`, divID);
      break;
    }
    await db.saveLinks(newLinks, isScraps).catch(() => stopLoop = true);
    if (stopLoop || stop.now) {
      log('[Data] Stopped early!');
      logProgress.reset(progressID);
      break;
    }
    if (isFavorites && username) await db.saveFavorites(username, newLinks);
    currLinks = currLinks += newLinks.length;
    currPageCount++;
    if (isFavorites) {
      nextPage = $(`.pagination a.right`).attr('href');
      if (nextPage) nextPage = url.split('/favorite')[0] + nextPage;
      else break;
    }
    await waitFor();
  }
  if (!stop.now) log(`[Data] ${currLinks} submissions found!`);
  logProgress.reset(progressID);
}
/**
 * Gathers and saves the comments from given HTML or url.
 * @param {Cheerio} $ 
 * @param {String} submission_id 
 * @param {String} url 
 */
export async function scrapeComments($, submission_id, url) {
  if (stop.now) return logProgress.reset(progressID);
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
  if(!comments.length) return;
  return db.saveComments(comments);
}
const metadataID = 'scrape-metadata';
/**
 * Gathers all of the relevant metadata from all uncrawled submission pages.
 * @returns 
 */
export async function scrapeSubmissionInfo(data = null, downloadComments) {
  const links = data || await db.getSubmissionLinks();
  if (!links.length || stop.now) return logProgress.reset(progressID);
  log(`[Data] Saving data for ${links.length} submissions...`, metadataID);
  let index = 0;
  while (index < links.length && !stop.now) {
    logProgress({transferred: index+1, total: links.length}, progressID);
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
      thumbnail_url: $('.page-content-type-text, .page-content-type-music').find('#submissionImg').attr('src') || '',
    };
    // Test to fix FA url weirdness
    if (!/^https/i.test(data.content_url)) data.content_url = 'https:' + data.content_url;
    if (data.thumbnail_url && !/^https/i.test(data.thumbnail_url))
      data.thumbnail_url = 'https:' + data.thumbnail_url;
    // Save data to db
    await db.saveMetaData(links[index].url, data);
    // Save comments
    if (downloadComments) await scrapeComments($, data.id);
    index++;
    if (index % 2) await waitFor(1000);
  }
  if (!stop.now) log('[Data] Save complete!');
  logProgress.reset(progressID);
}
