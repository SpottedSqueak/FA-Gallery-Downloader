import { FA_URL_BASE, FA_LOGIN, FA_SETTINGS } from "./constants.js";
import { setOwnedAccount } from "./database-interface.js";
import { getHTML, log, logLast } from "./utils.js";

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
  const $ = await getHTML(FA_URL_BASE);
  if (/classic/i.test($('body').data('static-path'))) {
    log(`[Warn] Using incompatible old FA theme, prompting user to update settings`);
    page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);
    page.on('close', () => {
      checkForOldTheme();
    });
    await page.goto(FA_SETTINGS);
    await page.$eval('.template-change', el => {
      el.value = 'beta';
    });
    await page.$eval('.confirm-pass input[type="password"]', el => {
      el.parentElement.scrollIntoView();
      el.style.outline = '2px solid red';
      alert('[Data] User theme changed, enter password to save settings!');
    })
    await page.waitForNavigation();
    return checkForOldTheme(page);
  }
  log(`[Data] FA Modern theme confirmed!`);
  page?.close();
  page = null;
}
function setUsername($) {
  // Need to get username for loggedin user
  let href = $('a[href^="/user"]').first().attr('href');
  href.replace('#', '');
  if (!href) return false;
  username = href.split('user/')[1].split('/')[0];
  return username;
}
async function checkIfCookiesExpired() {
  // Do a final check just to be sure cookies didn't expire
  const $ = await getHTML(FA_URL_BASE);
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
  logLast('Not logged in! Requesting user to do so...');
  await page.goto(FA_LOGIN);
  while (/login/i.test(await page.url())) {
    await page.waitForNavigation();
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
  log('Checking logged in status...');
  if (!await checkIfLoggedIn()) 
    await logInUser().catch(() => page = null);
  if(username) {
    log(`User logged-in as: ${username}`);
    await setOwnedAccount(username);
  }
  page?.close();
  page = null;
}
