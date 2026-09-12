const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const context = vm.createContext({ console, URL, Date, Math, crypto });
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "../core.js"), "utf8"),
  context,
);
const { LiveOnAir } = context;
const plain = (value) => JSON.parse(JSON.stringify(value));
function response(data, ok = true, status = 200) {
  return {
    ok,
    status,
    async text() {
      return typeof data === "string" ? data : JSON.stringify(data);
    },
  };
}
test("parses supported Bilibili and Douyu room inputs", () => {
  assert.deepEqual(plain(LiveOnAir.parseRoom("https://live.bilibili.com/6")), {
    platform: "bilibili",
    roomId: "6",
  });
  assert.deepEqual(plain(LiveOnAir.parseRoom("https://www.douyu.com/9999")), {
    platform: "douyu",
    roomId: "9999",
  });
  assert.deepEqual(plain(LiveOnAir.parseRoom("9999", "douyu")), {
    platform: "douyu",
    roomId: "9999",
  });
});
test("rejects empty, unknown, and vanity rooms", () => {
  assert.throws(() => LiveOnAir.parseRoom("", "douyu"), /请输入/);
  assert.throws(() => LiveOnAir.parseRoom("room-name", "douyu"), /数字房间/);
  assert.throws(() => LiveOnAir.parseRoom("42", "other"), /请选择/);
});
test("normalizes settings and strips unsafe ntfy topic characters", () => {
  assert.deepEqual(plain(LiveOnAir.normalizeSettings({})), {
    intervalMinutes: 5,
    desktop: true,
    phone: false,
    ntfyTopic: "",
  });
  assert.equal(
    LiveOnAir.normalizeSettings({
      intervalMinutes: 999,
      desktop: false,
      phone: true,
      ntfyTopic: "hello/world!",
    }).ntfyTopic,
    "helloworld",
  );
});
test("maps Bilibili status responses", async () => {
  const result = await LiveOnAir.checkRoom(
    { platform: "bilibili", roomId: "6" },
    async () =>
      response({
        code: 0,
        data: { live_status: 1, title: "Live title", uid: 123 },
      }),
  );
  assert.equal(result.live, true);
  assert.equal(result.title, "Live title");
  assert.equal(result.url, "https://live.bilibili.com/6");
});
test("maps Douyu status responses and detects offline rooms", async () => {
  const result = await LiveOnAir.checkRoom(
    { platform: "douyu", roomId: "9999" },
    async () =>
      response({
        room: { show_status: 2, room_name: "Break", owner_name: "Host" },
      }),
  );
  assert.equal(result.live, false);
  assert.equal(result.title, "Break");
  assert.equal(result.owner, "Host");
});
test("provider errors are clear", async () => {
  await assert.rejects(
    LiveOnAir.checkRoom({ platform: "douyu", roomId: "1" }, async () =>
      response("<html></html>"),
    ),
    /无法解析/,
  );
  await assert.rejects(
    LiveOnAir.checkRoom({ platform: "bilibili", roomId: "1" }, async () =>
      response({ code: -1, message: "blocked" }),
    ),
    /blocked/,
  );
});
test("notification text uses labels and platform links", () => {
  const text = LiveOnAir.buildNotification(
    { platform: "douyu", roomId: "9999", label: "YYF" },
    { title: "Rank games", owner: "yyf", url: "https://www.douyu.com/9999" },
  );
  assert.equal(text.title, "YYF 开播了");
  assert.ok(text.message.includes("Rank games"));
  assert.equal(text.url, "https://www.douyu.com/9999");
});
