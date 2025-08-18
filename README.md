# Highlight "Proposal" Chrome Extension

Highlights every occurrence of the word "Proposal" on any webpage.

## Install (Chrome/Edge)

1. Open `chrome://extensions`.
2. Enable "Developer mode" (top-right).
3. Click "Load unpacked" and select this folder: `/Users/lolarucker/Projects/upwork-browser-plugin`.
4. Visit any page; occurrences of "Proposal" will be highlighted.

Notes:
- Matching is case-insensitive and for the whole word (e.g., matches "proposal" but not "proposals").
- Dynamic content is handled via a `MutationObserver`.


## New features

- Highlights exact phrases in green (configurable list; default includes "Proposals: 5 to 10").
- Highlights red words (default includes "India").
- Manage red-highlight words in the extension options page.

To open options: right-click the extension in `chrome://extensions` → "Details" → "Extension options".


