const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "../popup.css"), "utf8");

test("popup CSS keeps a stable browser-extension width", () => {
  assert.match(css, /--popup-width:\s*390px/);
  assert.match(css, /--popup-height:\s*600px/);
  assert.match(css, /width:\s*var\(--popup-width\)/);
  assert.match(css, /min-width:\s*var\(--popup-width\)/);
});

test("popup CSS avoids viewport-width sizing that can collapse Edge popups", () => {
  assert.doesNotMatch(css, /100vw/);
  assert.doesNotMatch(css, /max-width:\s*100vw/);
});

test("popup CSS uses an internal scrolling shell for mouse-wheel scrolling", () => {
  assert.match(css, /\.scroll-shell\s*{/);
  assert.match(css, /overflow-y:\s*auto/);
  assert.match(css, /flex:\s*1/);
});

test("popup CSS draws a rounded outer app frame", () => {
  assert.match(css, /\.app-frame\s*{/);
  assert.match(css, /border-radius:\s*30px/);
  assert.match(css, /overflow:\s*hidden/);
});

test("popup CSS styles the custom platform picker instead of relying on native menus", () => {
  assert.match(css, /\.platform-picker\s*{/);
  assert.match(css, /\.platform-radio:checked \+ \.platform-option\s*{/);
  assert.doesNotMatch(css, /\.platform-option\.active/);
});
