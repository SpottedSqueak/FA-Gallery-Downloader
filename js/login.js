import { FA_URL_BASE, FA_LOGIN, FA_SETTINGS } from "./constants.js";
import { setOwnedAccount } from "./database-interface.js";
import { getHTML } from "./utils.js";
/** @import { CheerioAPI } from 'cheerio' */

export let faRequestHeaders = {};
export let username = '';
let browser = null;
let page = null;

function setRequestHeaders(faCookies) {
  faRequestHeaders = {
    headers: {
      cookie: `a=${faCookies.a}; b=${faCookies.b}`,
    }
  };
}
export async function checkForOldTheme(page) {
  const $ = await getHTML(FA_URL_BASE).catch(() => false);
  if (!$) return console.log(`[Warn] FA might be down, please try again later`);
  if (/classic/i.test($('body').data('static-path'))) {
    console.log(`[Warn] Using incompatible old FA theme, prompting user to update settings`);
    page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    let resolver = () => {};
    page.once('close', () => {
      resolver();
    });
    await page.goto(FA_SETTINGS);
    await page.$eval('.template-change', el => {
      el.value = 'beta';
    });
    await page.$eval('.confirm-pass input[type="password"]', el => {
      el.parentElement.scrollIntoView();
      el.style.outline = '2px solid red';
      alert('[Data] Modern/beta FA theme required, enter password to switch to the Modern theme!');
    })
    await new Promise((resolve, reject) => {
      resolver = resolve;
      page.waitForNavigation().then(resolve).catch(reject);
    });
    return checkForOldTheme(page);
  }
  console.log(`[Data] FA Modern theme confirmed!`);
  page?.close();
  page = null;
}
/**
 * 
 * @param {CheerioAPI} $ 
 * @returns 
 */
function setUsername($) {
  // Need to get username for loggedin user
  let href = $('#ddmenu a[href^="/user"]').first().attr('href');
  if (!href) return false;
  href.replace('#', '');
  username = href.split('user/')[1].split('/')[0];
  return username;
}
async function checkIfCookiesExpired() {
  // Do a final check just to be sure cookies didn't expire
  const $ = await getHTML(FA_URL_BASE).catch(() => false);
  if (!$) return false;
  const notLoggedIn = !setUsername($);
  if (!notLoggedIn) await setOwnedAccount(username);
  return notLoggedIn;
}

export async function checkIfLoggedIn(newBrowser) {
  browser = browser || newBrowser;
  const queryPage = page || await browser.pages().then(p => p[0]);
  const cookies = await queryPage.cookies(FA_URL_BASE);
  const loggedInCookies = { a: false, b: false };
  cookies.forEach(val => {
    if (/^(a|b)$/i.test(val.name)) loggedInCookies[val.name] = val.value;
  });
  setRequestHeaders(loggedInCookies);
  if (!(loggedInCookies.a && loggedInCookies.b)) return false;
  const areExpired = await checkIfCookiesExpired();
  return !areExpired;
}

async function logInUser() {
  page = page || await browser.newPage();
  page.setDefaultNavigationTimeout(0);
  console.log('Not logged in! Requesting user to do so...');
  await page.goto(FA_LOGIN);
  let resolver = () => {};
  page.once('close', () => {
    resolver();
  });
  while (/login/i.test(await page.url())) {
    await new Promise((resolve, reject) => {
      resolver = resolve;
      page.waitForNavigation().then(resolve).catch(reject);
    });
  }
  await checkIfLoggedIn();
}
export async function forceNewLogin(browser) {
  let queryPage = await browser.pages().then(p => p[0]);
  // Log previous user out
  const cookies = await queryPage.cookies(FA_URL_BASE);
  await queryPage.deleteCookie(...cookies);
  username = '';
  return handleLogin(browser);
}

export async function handleLogin(newBrowser = browser) {
  browser = browser || newBrowser;
  // Get credentials
  console.log('Checking logged in status...');
  if (!await checkIfLoggedIn()) 
    await logInUser().catch(() => page = null);
  if(username) {
    console.log(`User logged-in as: ${username}`);
    await setOwnedAccount(username);
  }
  page?.close();
  page = null;
}
