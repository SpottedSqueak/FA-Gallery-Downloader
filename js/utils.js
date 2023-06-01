import { faRequestHeaders } from './login.js';
import * as cheerio from 'cheerio';
import got from 'got';

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
 * Overwrites the previous log message with a new one
 * @param {String} text 
 */
export async function logLast(text) {
  if (!page?.isClosed()) {
    page.evaluate(`document.querySelector('#status p:last-child').innerHTML = '${text}'`);
  }
  console.log(text);
}
/**
 * Logs a message to the user.
 * @param {String} text 
 */
export async function log(text) {
  if (!page?.isClosed()) {
    page.evaluate(`document.querySelector('#status').innerHTML += '<p>${text}</p>'`);
  }
  console.log(text);
}
/**
 * Retrieves the HTML from the given URL and loads it into a Cheerio object.
 * @param {String} url 
 * @returns Loaded Cheerio Object
 */
export async function getHTML(url) {
  const html = await got(url, faRequestHeaders).text();
  return cheerio.load(html);
}
/**
 * Binds the given Page object for future log messages.
 * @param {Puppeteer.Page} newPage 
 */
export function init(newPage) {
  page = newPage;
}
