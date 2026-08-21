# ER Sense - Chrome Extension

The browser version of [ER Sense](https://vedantjaiswal001.github.io/ersense/). It **auto-captures errors from any web page** and explains them in one click, adds a right-click "Explain with ER Sense" on any selected error, and gives you the full paste-and-explain analyzer in a docked side panel - all sharing the same engine as the web app.

## Features

- **Auto-capture** - a content script hooks `window.onerror` and unhandled promise rejections on the top frame of every page. The toolbar icon shows a badge with the count, and the side panel lists the errors so you can explain the latest with one click. (It intentionally does not hook `console.error` - that would capture third-party log noise and mis-attribute every site's logs to the extension.)
- **Right-click to explain** - select any error text on a page, right-click, and choose "Explain with ER Sense".
- **Docked side panel** - clicking the toolbar icon opens ER Sense as a persistent Chrome side panel (not a transient popup), so it stays open while you browse. Paste an error, stack trace, or code and get the same three modes (Error Explanation, Code Doctor, Debug), issue cards with line numbers, and a Fix All block. The panel refreshes live as new errors are captured and as you switch tabs.
- **Bring-your-own-key** - add a free Gemini key in the side panel's Settings; stored locally, sent directly to Google. Works offline (built-in error library) with no key.

## Install (load unpacked)

1. Open `chrome://extensions` in Chrome (or any Chromium browser: Edge, Brave, Arc).
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Pin the ER Sense icon, click it to open the side panel, open **Settings**, and paste your free Gemini key (optional - offline mode works without one).

### Move the panel to the left

Chrome's side panel opens on the right by default. Its side is a **global browser setting**, not something an extension can set. To dock it on the left: open the side panel, click the panel's own header menu (or right-click the toolbar area) and choose **"Show on left side"** - or go to Chrome **Settings -> Appearance -> Side panel -> Show on the left**. Chrome then keeps every side panel (including ER Sense) on the left.

## How auto-capture works (and how to test it)

A MAIN-world content script hooks `window.onerror` and `unhandledrejection` on the page's top frame. When the page throws, the error is relayed to the service worker, stored per tab, and the toolbar badge shows the count. Open the side panel to see the list and click **Explain latest**. The panel refreshes on its own as new errors arrive and as you switch tabs.

**Important limitation:** errors you type into the **DevTools Console** (e.g. running `null.foo` there) are *not* captured. The browser reports console-typed exceptions only to DevTools via the inspector protocol - they are never dispatched as the page's `error` event, so no extension can see them (and `chrome.debugger`, the only API that could, can't attach while DevTools is open). This is a browser behavior, not an extension bug. Capture works for real errors thrown by page scripts.

### Reliable test procedure (no DevTools needed)

1. Load the extension (steps above) and open `test/throw.html` from this folder in the browser (drag it into a tab, or serve it).
2. Click the ER Sense icon once - the side panel opens and should say "Watching this page for JavaScript errors."
3. Click **Throw TypeError** (or wait ~1s for the page to throw a SyntaxError on its own).
4. The ER Sense icon shows a **number badge** and the panel lists the error live; click **Explain latest** to analyze it.

This flow was verified end to end by loading the built extension in Chromium and confirming the captured errors and badge count in the service worker's storage.

## Permissions - why

- `storage` - saves your API key and per-tab captured errors.
- `activeTab` / `scripting` - read the current tab so the popup knows which page's errors to show.
- `contextMenus` - the right-click "Explain" item.
- `host_permissions: generativelanguage.googleapis.com` - lets the popup call the Gemini API directly (no backend).
- `<all_urls>` content script - required to detect errors on whatever page you're debugging. It only reads error events; it never sends page content anywhere except the error text you choose to explain.

## How it's built

Plain Manifest V3, no build step. The side panel reuses the web app's framework-free core (`lib/analyze.js`, `classify.js`, `gemini.js`, `offlineDb.js`, `parseError.js`) plus a small dependency-free syntax highlighter.

```
extension/
  manifest.json
  sidepanel.html                       # docked side-panel shell (full height)
  popup.html / popup.css / popup.js    # shared analyzer + settings UI
  background.js                        # service worker: capture store, badge, side panel, context menu
  content-main.js                      # MAIN world: hooks error events
  content-bridge.js                    # isolated world: relays to the service worker
  lib/                                 # shared engine (same as the web app)
  icons/
```

Made by Vedant Jaiswal.
