# 🐾 FA Gallery Downloader 🐾

### Dead simple gallery download for FurAffinity

---

## Dev Info
Built using `node v16.20.0` and `npm v8.19.4`

To install: `npm i`

To run locally, just use `npm run start`

NOTE: You'll need a **valid, up-to-date Chromium/Chrome or Firefox install** for this to work, as the program opens a browser instance to allow for login to FA. **Why is this?** A lot of users have their galleries hidden from site visitors, so this is the easiest way to consistently ensure access to galleries. This is done almost the exact same way [Postybirb](https://www.postybirb.com/) does it! Just that I don't embed a version of Chromium in this project (you can get one if you'd like on your own).

You'll need [Caxa](https://www.npmjs.com/package/caxa) to build the application bundle for your OS. Then run `npm run build:windows` | `npm run build:mac` | `npm run build:linux` to build for those environments (I currently only have access to Windows, sorry!).

***Other bundlers may work***, but I had a lot of trouble with `pkg`, which oddly doesn't seem to support ES6 syntax.

This could easily be expanded to download other galleries (of course), and if there's demand for it I can add that in. My goal was for folks to use this to download and backup their own galleries.

## How it works

Boot it up to open a window to either the FA login page, or to the status window showing the program progress (depending on if you've logged in previous or ). It will then walk through your gallery, first the main gallery and then scraps, collecting all of the submission links present. Once complete, it will start visiting and collecting metadata (title, description, tags, etc.) for each submission, as well as queuing staggered downloads of the content for each submission.

The downloaded submissions can be found in the `/fa_gallery_downloader/downloaded_content` folder, placed in the same folder as the executable.

It supports resuming, as it can take upwards of half an hour to fully download large galleries (possibly more).

I plan to work on this more when I have time, but I'm a pretty busy guy! At the very least, the below #ToDo of adding in locally browseable files would be ideal.


## #ToDo

- [x] Hide console
- [ ] Log errors to file
- [ ] Clean up the interface some (better logging, maybe download animations?)
- [ ] Export data to JSON/CSV files
- [ ] Add a locally browsable copy of the given FA gallery
- [ ] Format description text to BBCode for ease of cross posting (Maybe?)
- [ ] Skip submission link gathering when traversing previously traversed galleries (yes, that makes sense)


Check out my stuff on FA if you'd like!

**SFW:** https://www.furaffinity.net/user/forest-wolf

**NSFW:** (You can find it! :P)
