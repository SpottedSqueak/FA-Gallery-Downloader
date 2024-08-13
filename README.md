# 🐾 FA Gallery Downloader 🐾

### Dead simple gallery download for FurAffinity
---
### [> Download Latest Release <](https://github.com/SpottedSqueak/FA-Gallery-Downloader/releases)
---
## Dev Info
Built using `node v22.6.0` and `npm v10.5.1`

Install: `npm i`

Run: `npm run start`

Build: `npm run build`

Database is `sqlite` and can be read with something like [DB Browser](https://sqlitebrowser.org/)

## Info

You login, type in an FA username, pick your options, and go. It will display download progress, and any messages associated with the download. You can stop and resume later at any point. 

The gallery information is saved in the containing folder under `fa_gallery_downloader`, with all content saved in `/fa_gallery_downloader/downloaded_content` folder, placed in the same folder as the executable. The database has all of the related submission metadata.

You can browse via the file system, or the *slick built-in replica-FA gallery viewer.* It's up to you!

***NOTE:*** You'll need a **valid, up-to-date Chromium/Chrome install** for this to work. If you do not have one, the program will download the latest Chromium build for you, much like [Electron](https://www.electronjs.org/) does. I don't download it by default to save bandwidth and time (and most folks have some version of it installed already).

***Why is a browser needed?*** A lot of users have their galleries hidden from site visitors, so this is the easiest way to consistently ensure access to galleries. This is done almost the exact same way [Postybirb](https://www.postybirb.com/) does it! Futhermore, the login is used to determine if the gallery you're downloading is one that you own, for future uploading to other sites via Postybirb importing.

You'll need [@radically-straightforward/package](https://github.com/radically-straightforward/radically-straightforward/tree/main/package) to build the application bundle for your OS. The resulting zip/gzip file will be a sibling of the extracted folder. Note that it will copy ALL files in the current directory, so you might want to copy only the files needed (no `.git` files or the entire `fa_gallery_downloader` folder) and run the build command in that folder instead. Or just download the latest Release, whatever's easiest.


## How it works

Start the program, login, choose a gallery and go. It will then walk through the gallery, first the main gallery and then scraps, collecting all of the submission links present. Once complete, it will start visiting and collecting metadata (title, description, tags, etc.) for each submission, as well as queuing staggered downloads of the content for each submission. I do this to prevent being blocked on FA's site.

The downloaded submissions can be found in the `/fa_gallery_downloader/downloaded_content` folder, placed in the same folder as the executable.

It supports resuming, as it can take upwards of half an hour to fully download large galleries (possibly more).

I hope it helps, it's always a good idea to not put all your eggs in one basket.

## Updating from v1.4 and below

Extract the zip folder in the same location as the previous version's executable. Run the new program and if you're missing any data (logged in accounts, gallery data, etc.) click the "Import Data" button. Assuming you have the `fa_gallery_downloader` folder in the same folder, it will copy over all of that data and restart.

## #DONE

- [x] Hide console (Only on Windows!)
- [x] Allow downloads from other user's galleries (still requires login)
- [x] Allow downloads of submission comments as well (not user icons though)
- [x] Downloads a valid version of Chromium if none exist
- [x] Log errors to file (Found under `/fa_gallery_downloader/logs`)
- [x] Clean up the interface some (better logging, download animations/progress bars)
- [x] Add a locally browsable copy of the given FA gallery (includes SEARCH!)
- [x] Export data for Postybirb+ integration
- [x] ~~Format description text to BBCode for ease of cross posting (Maybe?)~~ Postybirb integration negates this point
- [x] ~~Skip submission link gathering when traversing previously traversed galleries (yes, that makes sense)~~ (Not possible with how FA galleries work)
## #TODO

- [ ] Fix comic navigation so you can move between them inside of the gallery viewer

## Known Issues

-- See the issues tab above!

Check out my stuff on FA if you'd like!

**SFW:** https://www.furaffinity.net/user/forest-wolf

**NSFW:** (You can find it! :P)
