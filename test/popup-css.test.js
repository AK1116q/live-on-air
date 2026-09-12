const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "../popup.css"), "utf8");

test("popup CSS keeps a stable browser-extension width", () => {
  assert.match(css, /--popup-width:\s*390px/);
  assert.match(css, /width:\s*var\(--popup-width\)/);
  assert.match(css, /min-width:\s*var\(--popup-width\)/);
});

test("popup CSS avoids viewport-width sizing that can collapse Edge popups", () => {
  assert.doesNotMatch(css, /100vw/);
  assert.doesNotMatch(css, /max-width:\s*100vw/);
});
