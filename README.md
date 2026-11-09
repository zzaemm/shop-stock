# ShopStock

A simple stock log for small shopkeepers. Open it on a phone, tap to record what you sold or received, see what is running low. **No sign-up, no server, works offline.**

**Live app:** https://zzaemm.github.io/shop-stock/ _(open on your phone, then "Add to Home screen")_

## Why this exists

Many small shops track stock in a notebook or in their head. Spreadsheets are awkward on a phone and most inventory apps want accounts, subscriptions and training. ShopStock does one job with big buttons:

- **Tap -1 / +1** on an item when you sell or receive one.
- **Type a quick line** such as `sold 3 rice` or `+10 oil` for faster entry.
- **Low tab** shows what to reorder. Items at zero are always flagged.
- **History** shows every change with time and note, with a one-tap undo.
- **English and Malayalam** interface (see the note below).
- **Download CSV** of stock or history to open in a spreadsheet.

## Quick entry

| You type | What happens |
|---|---|
| `sold 3 rice` / `-3 rice` / `out 3 rice` | 3 kg less rice |
| `+10 oil` / `in 10 oil` / `got 10 oil` / `bought 10 oil` | 10 more oil |
| `sold 2,5 of rice flour` | decimals work, comma or dot |

Names are matched ignoring case. If a short name matches several items (for example "ric" for Rice and Rice Flour), the app asks for the full name instead of guessing. It will never let stock go below zero.

This is plain text matching, not an AI model, which keeps it instant, free and offline.

## Your data

Everything is stored **on the phone, in the browser**. Nothing is sent anywhere: no account, no analytics, no tracking.

The trade-off: clearing browser data or losing the phone loses the stock list. Use **Settings > Back up data** now and then (it downloads a file), and **Restore** to load it on the same or a new phone.

## Install on a phone

1. Open the live link in Chrome (Android) or Safari (iPhone).
2. Chrome: menu > *Install app* / *Add to Home screen*. Safari: Share > *Add to Home Screen*.
3. It then opens full-screen like an app and works with no internet after the first load.

## Run it locally

```bash
npm install
npm run serve        # prints a link you can open on a phone on the same Wi-Fi
```

Installing and offline mode need HTTPS or `localhost`, so test those on the live GitHub Pages link.

## Tests

```bash
npm test
```

32 tests, no browser needed:

- **Stock logic (16):** adding, selling, never going negative, decimal accuracy, undo, low-stock rules, quick-entry parsing, CSV safety, backup validation.
- **Real page in a simulated phone browser (16):** adding items, tapping buttons, quick entry, search, undo, delete confirmation, saving and reloading, corrupt-data recovery, language switch, and that every file the offline cache needs exists.

## How it is built

- `docs/core.js`: pure, immutable stock logic with no DOM or storage. Errors carry codes so the UI can show them in either language.
- `docs/app.js`: the interface. All text is inserted as text, never HTML, so an item named `<img onerror=...>` cannot run anything.
- `docs/sw.js`: service worker for offline use (cache-first, refreshes in the background).
- Plain HTML, CSS and JavaScript with no framework and no build step. The only dev dependency is jsdom for tests.

CSV exports prefix cells that start with `=`, `+`, `-` or `@` so a spreadsheet can never treat a product name as a formula.

## Deploy (GitHub Pages)

The site is the `docs/` folder. In the repo: **Settings > Pages > Deploy from a branch > `main` / `/docs`**.

## Limitations

- **One phone only.** There is no sync between devices.
- **No barcode scanning, prices or sales totals yet.**
- **Malayalam text needs a native-speaker review.** The translations were written to be simple and clear, but have not been checked by a shopkeeper or a native reviewer. Corrections welcome as issues or pull requests.
- Tested in a simulated browser and in code, not yet on a range of physical phones.

## License

MIT
