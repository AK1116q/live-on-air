const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
function harness() {
  const data = {};
  const fetchState = { bilibiliLive: false, douyuLive: false };
  const notifications = [];
  const opened = [];
  let messageListener;
  let alarmListener;
  const context = vm.createContext({
    console,
    URL,
    Date,
    Math,
    crypto,
    fetch: async (url) => {
      if (String(url).includes("bilibili"))
        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({
              code: 0,
              data: {
                live_status: fetchState.bilibiliLive ? 1 : 0,
                title: fetchState.bilibiliLive ? "Live now" : "Waiting",
                uid: 1,
              },
            });
          },
        };
      if (String(url).includes("douyu.com"))
        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({
              room: {
                show_status: fetchState.douyuLive ? 1 : 0,
                room_name: fetchState.douyuLive ? "Live now" : "Resting",
                owner_name: "Host",
              },
            });
          },
        };
      return {
        ok: true,
        status: 200,
        async text() {
          return "ok";
        },
      };
    },
    chrome: {
      runtime: {
        id: "test-extension",
        onInstalled: { addListener() {} },
        onMessage: {
          addListener(fn) {
            messageListener = fn;
          },
        },
      },
      storage: {
        local: {
          async get(keys) {
            if (Array.isArray(keys))
              return Object.fromEntries(
                keys
                  .filter((key) => key in data)
                  .map((key) => [key, structuredClone(data[key])]),
              );
            return structuredClone(data);
          },
          async set(values) {
            Object.assign(data, structuredClone(values));
          },
        },
      },
      alarms: {
        async clear() {},
        async create(name, options) {
          data.alarm = { name, options };
        },
        onAlarm: {
          addListener(fn) {
            alarmListener = fn;
          },
        },
      },
      notifications: {
        async create(id, options) {
          notifications.push({ id, options });
        },
        onClicked: { addListener() {} },
      },
      tabs: {
        async create(tab) {
          opened.push(tab.url);
        },
      },
    },
  });
  context.importScripts = (file) =>
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
      context,
    );
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../background.js"), "utf8"),
    context,
  );
  return {
    send: (message) =>
      new Promise((resolve) =>
        messageListener(message, { id: "test-extension" }, resolve),
      ),
    data,
    fetchState,
    notifications,
    opened,
    alarmListener,
  };
}
test("adds rooms after an initial status check and prevents duplicates", async () => {
  const h = harness();
  const added = await h.send({ type: "add", platform: "bilibili", input: "6" });
  assert.equal(added.ok, true);
  assert.equal(h.data.subscriptions.length, 1);
  assert.equal(h.data.subscriptions[0].wasLive, false);
  const duplicate = await h.send({
    type: "add",
    platform: "bilibili",
    input: "6",
  });
  assert.equal(duplicate.ok, false);
});
test("settings are saved and alarm interval follows settings", async () => {
  const h = harness();
  const result = await h.send({
    type: "settings",
    settings: {
      intervalMinutes: 12,
      desktop: false,
      phone: true,
      ntfyTopic: "x",
    },
  });
  assert.equal(result.ok, true);
  assert.equal(h.data.settings.intervalMinutes, 12);
  assert.equal(h.data.alarm.options.periodInMinutes, 12);
});
test("poll notifies only when a room transitions to live", async () => {
  const h = harness();
  h.data.settings = { intervalMinutes: 5, desktop: true, phone: false };
  h.data.subscriptions = [
    {
      id: "a",
      platform: "bilibili",
      roomId: "6",
      label: "Bili",
      enabled: true,
      wasLive: false,
    },
  ];
  await h.send({ type: "checkNow" });
  assert.equal(h.notifications.length, 0);
  h.fetchState.bilibiliLive = true;
  await h.send({ type: "checkNow" });
  assert.equal(h.notifications.length, 1);
  await h.send({ type: "checkNow" });
  assert.equal(h.notifications.length, 1);
});
test("toggle and remove update the watch list", async () => {
  const h = harness();
  await h.send({ type: "add", platform: "douyu", input: "9999" });
  const id = h.data.subscriptions[0].id;
  await h.send({ type: "toggle", id });
  assert.equal(h.data.subscriptions[0].enabled, false);
  await h.send({ type: "remove", id });
  assert.equal(h.data.subscriptions.length, 0);
});
