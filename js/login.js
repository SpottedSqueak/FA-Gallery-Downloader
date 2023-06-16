import { FA_URL_BASE, FA_LOGIN } from "./constants.js";
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

function setUsername($) {
  const href = $('img.loggedin_user_avatar')
  .parent().attr('href');
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

export async function checkIfLoggedIn(...queryPage) {
  queryPage = queryPage[0] || await browser.pages().then(p => p[0]);
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

export async function handleLogin(newBrowser) {
  browser = browser || newBrowser;
  // Get credentials
  log('Checking logged in status...');
  if (!await checkIfLoggedIn()) 
    await logInUser().catch(() => page = null);
  if(username) {
    log(`User logged-in as: <b>${username}</b>`);
    await setOwnedAccount(username);
  }
  page?.close();
  page = null;
}
