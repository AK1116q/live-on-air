# Changelog

## 0.1.5 - 2026-09-12

- Replaced the native platform dropdown with a rounded two-choice picker.
- Removed the visual mismatch caused by the browser-rendered select menu.
- Kept keyboard-readable radio semantics for the custom platform control.

## 0.1.4 - 2026-09-12

- Added a single rounded outer app frame around the whole popup.
- Moved the scrollbar inside the rounded frame so the outer edge looks cleaner.
- Kept the fixed popup sizing and Chinese interface from v0.1.3.

## 0.1.3 - 2026-09-12

- Switched the extension popup interface to Chinese.
- Changed popup scrolling to an internal scroll container so mouse-wheel scrolling works reliably in Edge.
- Refined the visual style with softer rounded rectangles and cleaner card surfaces.

## 0.1.2 - 2026-09-12

- Fixed an Edge popup regression where the extension could collapse into a thin scrollbar strip.
- Replaced viewport-width popup sizing with a fixed extension window width.
- Added a CSS regression test so popup sizing does not reintroduce viewport-width rules.

## 0.1.1 - 2026-09-12

- Stabilized the Edge and Chrome popup width to prevent visible shaking when the popup opens.
- Removed transform-based hover movement inside the popup so browser chrome does not recalculate the popup bounds.
- Added stable scroll gutters and hidden horizontal overflow for a calmer extension window.

## 0.1.0 - 2026-09-12

- Initial browser extension for Bilibili and Douyu live room alerts.
- Added desktop notifications, optional ntfy phone alerts, background polling, and a clean popup UI.
- Added local tests for room parsing, provider status mapping, notification formatting, and settings validation.
