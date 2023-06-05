import { faRequestHeaders } from './login.js';
import * as cheerio from 'cheerio';
import got from 'got';
import { dirname, join, } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import util from 'util';
import process from 'node:process';

// Get the main folder directory name
export const __dirname = join(dirname(fileURLToPath(import.meta.url)), '../');
// Page used to display messages to user
let page = null;

// Create debug log
const logDir ='./fa_gallery_downloader/logs';
const logFileName = join(logDir, `debug-${Date.now()}.log`);

function setupLogger() {
  fs.ensureFileSync(logFileName);
  const logFile = fs.createWriteStream(logFileName, { flags : 'w' });
  const hooks = ['log', 'error', 'info', 'warn', 'debug'];
  const defaultHooks = {};
  hooks.forEach((hook) => {
    defaultHooks[hook] = console[hook];
    console[hook] = function () {
      logFile.write(`[${hook}] ${util.format.apply(null, arguments)}\n`);
      defaultHooks[hook](util.format.apply(null, arguments));
    }
  });
  process.on('uncaughtException', function(err) {
    //logFile.write(`${err.stack}`);
    console.error(err);
    process.exit(2);
  });
  // Clean up log files
  fs.readdir(logDir, (_err, files) => {
    files.reverse().slice(5).forEach(val => {
      fs.remove(join(logDir, val));
    });
  });
}

/**
 * Creates a Promise that auto-resolves after the specified duration.
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
export async function logProgress(data = {}, id='file-progress-bar') {
  const { transferred, total } = data;
  if (!page?.isClosed()) {
    if (total) {
      await page.evaluate((transferred = 0, total = 0, id) => {
        const progress = document.getElementById(id);
        if (transferred && transferred >= total) {
          setTimeout(() => {
            progress.value = 0;
            progress.max = 0;
          }, 1000);
        }
        progress.setAttribute('value', transferred);
        progress.max = total;
      }, transferred, total, id);
    } else {
      // Set progress bar as "Busy"
      await page.evaluate((id) => {
        const progress = document.getElementById(id);
        progress.removeAttribute('value');
      }, id);
    }
  }
}
/**
 * Overwrites the previous log message with a new one
 * @param {String} text 
 */
export async function logLast(text, id) {
  const divClass = id ? `.${id}`: 'p:last-child';
  if (!page?.isClosed()) {
    page.evaluate(`document.querySelector('#status ${divClass}').innerHTML = '${text}'`).catch(() => log(text, id));
  }
  console.log(text);
}
/**
 * Logs a message to the user.
 * @param {String} text 
 */
export async function log(text, id, noConsole) {
  if (!page?.isClosed()) {
    page.evaluate(`document.querySelector('#status').insertAdjacentHTML('afterbegin', '<p class="${id}">${text}</p>')`);
  }
  if (!noConsole) console.log(text);
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

setupLogger();
