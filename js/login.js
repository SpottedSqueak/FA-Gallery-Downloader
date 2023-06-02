import { FA_URL_BASE, FA_LOGIN } from "./constants.js";
import { log, getHTML } from "./utils.js";
import { default as htmlDoc } from './html.js';

export let faRequestHeaders = null;
export let username = '';
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
  return notLoggedIn;
}

async function checkIfLoggedIn() {
  const cookies = await page.cookies(FA_URL_BASE);
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
  console.log('Not logged in! Requesting user to do so...');
  await page.goto(FA_LOGIN);
  while (/login/i.test(await page.url())) {
    await page.waitForNavigation();
  }
  await checkIfLoggedIn();
}

export async function handleLogin(newPage) {
  page = newPage;
  // Get credentials
  if (!await checkIfLoggedIn()) await logInUser();
  await page.setContent(htmlDoc);
  page = null;
  log(`User logged-in as: ${username}`);
}
