import { faRequestHeaders } from './login.js';
import * as cheerio from 'cheerio';
import got from 'got';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
// Get the folder directory name
export const __dirname = join(dirname(fileURLToPath(import.meta.url)), '../');

let page = null;
/**
 * Creates a Promise that auto-resolves after the specified duration
 * @param {Number} t 
 * @returns A timed Promise
 */
export async function waitFor(t = 1000) {
  return new Promise(r => setTimeout(r, t));
}
/**
 * Updates the current display of download progress for content.
 * @param {Object} data 
 * @param {String} id 
 */
export async function logProgress(data, id) {
  const { transferred, total, percentage } = data;
  const divClass = id ? `.${id}`: 'p:last-child';
  if (!page?.isClosed()) {
    const html = `<progress value="${transferred}" max="${total}"></progress> ${percentage}%`;
    await page.evaluate(`document.querySelector('#status ${divClass}').innerHTML = '${html}'`);
  }
}
/**
 * Overwrites the previous log message with a new one
 * @param {String} text 
 */
export async function logLast(text, id) {
  const divClass = id ? `.${id}`: 'p:last-child';
  if (!page?.isClosed()) {
    await page.evaluate(`document.querySelector('#status ${divClass}').innerHTML = '${text}'`);
  }
  console.log(text);
}
/**
 * Logs a message to the user.
 * @param {String} text 
 */
export async function log(text, id) {
  if (!page?.isClosed()) {
    await page.evaluate(`document.querySelector('#status').innerHTML += '<p class="${id}">${text}</p>'`);
  }
  console.log(text);
}
/**
 * Retrieves the HTML from the given URL and loads it into a Cheerio object.
 * @param {String} url 
 * @returns Loaded Cheerio Object
 */
export function getHTML(url) {
  return got(url, faRequestHeaders).text().then((result) => {
    console.log(`Loaded: ${url}`);
    return cheerio.load(result);
  }).catch((e) => console.log(e));
}
/**
 * Binds the given Page object for future log messages.
 * @param {Puppeteer.Page} newPage 
 */
export function init(newPage) {
  page = newPage;
}
