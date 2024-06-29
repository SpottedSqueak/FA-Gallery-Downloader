import { faRequestHeaders, username } from './login.js';
import * as cheerio from 'cheerio';
import got from 'got';
import { dirname, join, } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import * as db from './database-interface.js';
import util from 'util';
import { exitCode, default as process, platform } from 'node:process';
import { FA_URL_BASE, RELEASE_CHECK, LOG_DIR as logDir } from './constants.js';

export const isWindows = platform === 'win32';
export const isMac = platform === 'darwin';

export let hideConsole = () => {};

export const stop = {
  should: false,
  get now() {
    return this.should || !!exitCode;
  },
  set now(shouldStop) {
    this.should = shouldStop;
  },
  reset() {
    this.should = false;
  }
};

// Get the main folder directory name
export const __dirname = join(dirname(fileURLToPath(import.meta.url)), '../');
// Page used to display messages to user
let page = null;
let version = '';

export function getVersion() {
  if (!version) {
    version = JSON.parse(fs.readFileSync(join(__dirname, './package.json'), 'utf8'))?.version;
  }
  return version;
}

/**
 * Creates a Promise from a non-async function. Useful for error catching
 * outside of try/catch blocks.
 * 
 * @param {Function} method 
 * @returns 
 */
export function getPromise(method) {
  return new Promise((resolve, reject) => {
    const results = method();
    (results) ? resolve(results) : reject();
  });
}
// Create debug log
const logFileName = join(logDir, `debug-${Date.now()}.log`);

function setup() {
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
  process.on('uncaughtException', async function(err) {
    //logFile.write(`${err.stack}`);
    stop.now = true;
    console.error(err);
    await db.close();
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
export async function logProgress(progress = {}, bar='file') {
  const { transferred: value, total: max, filename } = progress;
  let reset = !max;
  if (!page?.isClosed()) {
    const data = {value, max, reset, bar, filename };
    await page.evaluate(`window.logProgress?.(${JSON.stringify(data)})`);
  }
}
logProgress.reset = (id) => {
  if (id) logProgress({ transferred: 0, total: 1 }, id);
}
logProgress.busy = (id) => {
  if (id) logProgress({ transferred: 0, total: 0 }, id);
}
/**
 * Overwrites the previous log message with a new one
 * @param {String} text 
 */
export async function logLast(text, id) {
  if (!page?.isClosed()) {
    const data = { text, id, replaceLast: true };
    page.evaluate(`window.logMsg?.(${JSON.stringify(data)})`);
  }
  console.log(text);
}
/**
 * Logs a message to the user.
 * @param {String} text 
 */
export async function log(text, id, noConsole) {
  if (!page?.isClosed() && page) {
    page.evaluate(`window.logMsg?.(${JSON.stringify({ text, id })})`);
  }
  if (!noConsole) console.log(text);
}
/**
 * Retrieves the HTML from the given URL and loads it into a Cheerio object.
 * @param {String} url 
 * @returns Loaded Cheerio Object
 */
export function getHTML(url, sendHeaders = true) {
  const headers = sendHeaders ? faRequestHeaders : {};
  headers.timeout = { response: 3000 };
  return got(url, headers).text()
  .then((result) => {
    console.log(`Loaded: ${url}`);
    return cheerio.load(result);
  }).catch((e) => {
    console.error(e);
    return Promise.reject(e);
  });
}
/**
 * Checks Github for the latest version.
 * @returns {Object}
 */
export async function releaseCheck() {
  const data = { current: getVersion() };
  let $ = await getHTML(RELEASE_CHECK, false).catch(() => false);
  if ($) {
    const latest = $('a.Link--primary').first().text().replace('v', '');
    data.latest = latest;
  }
  return data;
}
export async function urlExists(url, sendHeaders = true) {
  let headers = sendHeaders ? faRequestHeaders : {};
  headers = {...headers, method: 'HEAD', timeout: { response: 3000 }};
  return got(url, headers).then(() => true).catch(() => false);
}
export async function isSiteActive() {
  return urlExists(FA_URL_BASE);
}
export async function sendStartupInfo(data = {}) {
  if (!data.username) data.username = username;
  if (!data.accounts) data.accounts = await db.getOwnedAccounts();
  return page.evaluate(`window.setPageInfo?.(${JSON.stringify(data)})`);
}
export async function setActive(val = true) {
  if(stop.now) return;
  return page.evaluate(`window.setActive?.(${val})`);
}
/**
 * Binds the given Page object for future log messages.
 * @param {Puppeteer.Page} newPage 
 */
export async function init(newPage) {
  page = newPage;
  if (isWindows) {
    hideConsole = await import('node-hide-console-window')
      .then((hc) => hc.hideConsole)
      .catch(() => () => {});
  }
}

setup();
