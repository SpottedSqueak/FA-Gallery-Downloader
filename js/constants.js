export const FA_URL_BASE = 'https://www.furaffinity.net';
export const FA_USER_BASE = FA_URL_BASE + '/user/';
export const FA_LOGIN = FA_URL_BASE + '/login';
export const FA_SETTINGS = FA_URL_BASE + '/controls/settings';
export const DEFAULT_BROWSER_PARAMS = [
  '--app=data:text/html, "Loading..."',
  '--window-size=1280,720',
  '--disable-features=IsolateOrigins',
  '--disable-features=BlockInsecurePrivateNetworkRequests',
  '--allow-file-access-from-files',
  '--disable-extensions',
  '--disable-automation',
];
export const IGNORE_DEFAULT_PARAMS = [
  '--enable-automation',
  '--disable-site-isolation-trials',
  '--disable-blink-features=AutomationControlled',
  `--enable-blink-features=IdleDetection`
];
export const BROWSER_DIR = './fa_gallery_downloader/browser_profiles/';
export const DOWNLOADED_BROWSER_DIR = './fa_gallery_downloader/downloaded_browser';
export const LOG_DIR = './fa_gallery_downloader/logs';
export const DOWNLOAD_DIR = './fa_gallery_downloader/downloaded_content';
export const EXPORT_DIR = './fa_gallery_downloader/exports';
export const DB_LOCATION = './fa_gallery_downloader/databases/fa-gallery-downloader.db';
export const RELEASE_CHECK = 'https://github.com/SpottedSqueak/FA-Gallery-Downloader/releases';
