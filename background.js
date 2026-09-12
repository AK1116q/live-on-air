importScripts("core.js");
const STORE = {
  subscriptions: "subscriptions",
  settings: "settings",
};
async function getAll() {
  const data = await chrome.storage.local.get([
    STORE.subscriptions,
    STORE.settings,
  ]);
  return {
    subscriptions: Array.isArray(data[STORE.subscriptions])
      ? data[STORE.subscriptions].map(LiveOnAir.normalizeSubscription)
      : [],
    settings: LiveOnAir.normalizeSettings(data[STORE.settings]),
  };
}
async function saveAll(subscriptions, settings) {
  await chrome.storage.local.set({
    [STORE.subscriptions]: subscriptions,
    [STORE.settings]: settings,
  });
  await schedule(settings.intervalMinutes);
}
async function schedule(intervalMinutes = 5) {
  await chrome.alarms.clear("poll");
  await chrome.alarms.create("poll", {
    periodInMinutes: Math.min(120, Math.max(1, Number(intervalMinutes) || 5)),
  });
}
async function notifyPhone(settings, notification) {
  if (!settings.phone || !settings.ntfyTopic) return false;
  const response = await fetch(
    `https://ntfy.sh/${encodeURIComponent(settings.ntfyTopic)}`,
    {
      method: "POST",
      body: `${notification.message}\n${notification.url}`,
      headers: {
        Title: notification.title,
        Tags: "tv",
        Click: notification.url,
      },
    },
  );
  if (!response.ok) throw new Error(`ntfy HTTP ${response.status}`);
  return true;
}
async function notifyDesktop(settings, subscription, notification) {
  if (!settings.desktop) return false;
  await chrome.notifications.create(`live-${subscription.id}-${Date.now()}`, {
    type: "basic",
    iconUrl: "icon.png",
    title: notification.title,
    message: notification.message,
    priority: 2,
  });
  return true;
}
async function poll({ forceNotify = false } = {}) {
  const { subscriptions, settings } = await getAll();
  const results = [];
  for (const subscription of subscriptions) {
    if (!subscription.enabled) {
      results.push({ id: subscription.id, skipped: true });
      continue;
    }
    try {
      const status = await LiveOnAir.checkRoom(subscription);
      const wentLive = status.live && (!subscription.wasLive || forceNotify);
      subscription.wasLive = status.live;
      subscription.lastLive = status.live;
      subscription.lastTitle = status.title;
      subscription.lastCheckedAt = Date.now();
      subscription.lastError = "";
      if (wentLive) {
        const notification = LiveOnAir.buildNotification(subscription, status);
        await notifyDesktop(settings, subscription, notification);
        await notifyPhone(settings, notification);
      }
      results.push({ id: subscription.id, ok: true, live: status.live });
    } catch (error) {
      subscription.lastCheckedAt = Date.now();
      subscription.lastError = error.message;
      results.push({ id: subscription.id, ok: false, error: error.message });
    }
  }
  await saveAll(subscriptions, settings);
  return results;
}
chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await getAll();
  await schedule(settings.intervalMinutes);
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "poll") poll().catch(console.error);
});
chrome.notifications.onClicked.addListener(async (id) => {
  const { subscriptions } = await getAll();
  const target = subscriptions.find((item) => id.includes(item.id));
  if (target)
    await chrome.tabs.create({
      url: LiveOnAir.PLATFORMS[target.platform].url(target.roomId),
    });
});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !message?.type) return false;
  (async () => {
    const { subscriptions, settings } = await getAll();
    if (message.type === "list") return { subscriptions, settings };
    if (message.type === "settings") {
      const next = LiveOnAir.normalizeSettings(message.settings);
      await saveAll(subscriptions, next);
      return { subscriptions, settings: next };
    }
    if (message.type === "add") {
      const parsed = LiveOnAir.parseRoom(message.input, message.platform);
      const status = await LiveOnAir.checkRoom(parsed);
      const item = LiveOnAir.normalizeSubscription({
        ...parsed,
        label: message.label,
        enabled: true,
        wasLive: status.live,
        lastLive: status.live,
        lastTitle: status.title,
        lastCheckedAt: Date.now(),
      });
      if (
        subscriptions.some(
          (existing) =>
            existing.platform === item.platform &&
            existing.roomId === item.roomId,
        )
      )
        throw new Error("This room is already on the watch list.");
      await saveAll([item, ...subscriptions], settings);
      return item;
    }
    if (message.type === "remove") {
      await saveAll(
        subscriptions.filter((item) => item.id !== message.id),
        settings,
      );
      return true;
    }
    if (message.type === "toggle") {
      const item = subscriptions.find((room) => room.id === message.id);
      if (!item) throw new Error("Room not found.");
      item.enabled = !item.enabled;
      await saveAll(subscriptions, settings);
      return item;
    }
    if (message.type === "checkNow")
      return poll({ forceNotify: Boolean(message.forceNotify) });
    if (message.type === "testPhone") {
      await notifyPhone(settings, {
        title: "Live On Air test",
        message: "Phone alerts are connected.",
        url: "https://github.com/AK1116q/live-on-air",
      });
      return true;
    }
    throw new Error("Unsupported action.");
  })().then(
    (data) => respond({ ok: true, data }),
    (error) => respond({ ok: false, error: error.message }),
  );
  return true;
});
