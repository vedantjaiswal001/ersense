# ER Sense - Chrome Extension

The browser version of [ER Sense](https://vedantjaiswal001.github.io/ersense/). It **auto-captures errors from any web page** and explains them in one click, adds a right-click "Explain with ER Sense" on any selected error, and gives you the full paste-and-explain analyzer in a popup - all sharing the same engine as the web app.

## Features

- **Auto-capture** - a content script hooks `window.onerror`, unhandled promise rejections, and `console.error` on every page. The toolbar icon shows a badge with the count, and the popup lists the errors so you can explain the latest with one click.
- **Right-click to explain** - select any error text on a page, right-click, and choose "Explain with ER Sense".
- **Popup analyzer** - paste an error, stack trace, or code and get the same three modes (Error Explanation, Code Doctor, Debug), issue cards with line numbers, and a Fix All block.
- **Bring-your-own-key** - add a free Gemini key in the popup's Settings; stored locally, sent directly to Google. Works offline (built-in error library) with no key.

## Install (load unpacked)

1. Open `chrome://extensions` in Chrome (or any Chromium browser: Edge, Brave, Arc).
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Pin the ER Sense icon, click it, open **Settings**, and paste your free Gemini key (optional - offline mode works without one).

## Permissions - why

- `storage` - saves your API key and per-tab captured errors.
- `activeTab` / `scripting` - read the current tab so the popup knows which page's errors to show.
- `contextMenus` - the right-click "Explain" item.
- `host_permissions: generativelanguage.googleapis.com` - lets the popup call the Gemini API directly (no backend).
- `<all_urls>` content script - required to detect errors on whatever page you're debugging. It only reads error events; it never sends page content anywhere except the error text you choose to explain.

## How it's built

Plain Manifest V3, no build step. The popup reuses the web app's framework-free core (`lib/analyze.js`, `classify.js`, `gemini.js`, `offlineDb.js`, `parseError.js`) plus a small dependency-free syntax highlighter.

```
extension/
  manifest.json
  popup.html / popup.css / popup.js   # analyzer + settings UI
  background.js                        # service worker: capture store, badge, context menu
  content-main.js                      # MAIN world: hooks error events
  content-bridge.js                    # isolated world: relays to the service worker
  lib/                                 # shared engine (same as the web app)
  icons/
```

Made by Vedant Jaiswal.
