import { faRequestHeaders, username } from './login.js';
import * as cheerio from 'cheerio';
import got from 'got';
import { dirname, join, } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import util from 'util';
import { exitCode, default as process, platform } from 'node:process';

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
// Create debug log
const logDir ='./fa_gallery_downloader/logs';
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
  process.on('uncaughtException', function(err) {
    //logFile.write(`${err.stack}`);
    stop.now = true;
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
  if (!page?.isClosed()) {
    page.evaluate(`window.logMsg?.(${JSON.stringify({ text, id })})`);
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
export function passUsername() {
  return page.evaluate(`window.setUsername?.('${username}')`);
}
export function passSearchName(name) {
  return page.evaluate(`window.setSearchName?.('${name}')`);
}
export function passStartupInfo(data) {
  return page.evaluate(`window.setPageInfo?.(${JSON.stringify(data)})`);
}
/**
 * Binds the given Page object for future log messages.
 * @param {Puppeteer.Page} newPage 
 */
export async function init(newPage) {
  page = newPage;
  if (isWindows) {
    hideConsole = await import('node-hide-console-window').then((hc) => hc.hideConsole);
  }
}

setup();
