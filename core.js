(function (root) {
  "use strict";
  const PLATFORMS = {
    bilibili: {
      name: "哔哩哔哩",
      accent: "#fb7299",
      url(roomId) {
        return `https://live.bilibili.com/${roomId}`;
      },
    },
    douyu: {
      name: "斗鱼",
      accent: "#ff6a18",
      url(roomId) {
        return `https://www.douyu.com/${roomId}`;
      },
    },
  };
  function uid() {
    return (
      (globalThis.crypto && crypto.randomUUID && crypto.randomUUID()) ||
      `room-${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
  }
  function parseRoom(input, platformHint = "") {
    const value = String(input || "").trim();
    if (!value) throw new Error("请输入直播房间链接或房间 ID。");
    let platform = platformHint;
    let roomId = value;
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();
      const first = url.pathname.split("/").filter(Boolean)[0] || "";
      if (host.includes("bilibili.com")) platform = "bilibili";
      if (host.includes("douyu.com")) platform = "douyu";
      roomId = first;
    } catch {}
    if (!PLATFORMS[platform]) throw new Error("请选择哔哩哔哩或斗鱼。");
    if (!/^\d{1,12}$/.test(roomId)) throw new Error("目前只支持数字房间 ID。");
    return { platform, roomId };
  }
  function normalizeSettings(value = {}) {
    return {
      intervalMinutes: Math.min(
        120,
        Math.max(1, Number(value.intervalMinutes) || 5),
      ),
      desktop: value.desktop !== false,
      phone: Boolean(value.phone),
      ntfyTopic: String(value.ntfyTopic || "")
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 64),
    };
  }
  function normalizeSubscription(value) {
    if (!value || typeof value !== "object") throw new Error("订阅数据无效。");
    const parsed = parseRoom(value.roomId, value.platform);
    return {
      id: /^[a-zA-Z0-9-]{1,80}$/.test(String(value.id || ""))
        ? String(value.id)
        : uid(),
      platform: parsed.platform,
      roomId: parsed.roomId,
      label: String(value.label || "")
        .trim()
        .slice(0, 80),
      enabled: value.enabled !== false,
      wasLive: Boolean(value.wasLive),
      lastLive: Boolean(value.lastLive),
      lastTitle: String(value.lastTitle || "").slice(0, 160),
      lastCheckedAt: Number(value.lastCheckedAt) || 0,
      lastError: String(value.lastError || "").slice(0, 240),
    };
  }
  function roomName(item) {
    const platform = PLATFORMS[item.platform]?.name || item.platform;
    return item.label || `${platform} ${item.roomId}`;
  }
  async function fetchJson(url, options = {}, fetchImpl = fetch) {
    const response = await fetchImpl(url, {
      ...options,
      headers: {
        "user-agent": "Mozilla/5.0",
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    try {
      return JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch {
      throw new Error("平台返回了无法解析的数据。");
    }
  }
  async function checkBilibili(roomId, fetchImpl) {
    const data = await fetchJson(
      `https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${encodeURIComponent(roomId)}`,
      { headers: { referer: `https://live.bilibili.com/${roomId}` } },
      fetchImpl,
    );
    if (data.code !== 0 || !data.data)
      throw new Error(data.message || "哔哩哔哩房间查询失败。");
    return {
      live: Number(data.data.live_status) === 1,
      title: String(data.data.title || "未命名直播间"),
      owner: String(data.data.uname || data.data.uid || ""),
      url: PLATFORMS.bilibili.url(roomId),
    };
  }
  async function checkDouyu(roomId, fetchImpl) {
    const data = await fetchJson(
      `https://www.douyu.com/betard/${encodeURIComponent(roomId)}`,
      {},
      fetchImpl,
    );
    if (!data.room) throw new Error("斗鱼房间查询失败。");
    return {
      live:
        Number(data.room.show_status) === 1 ||
        Number(data.room.room_status) === 1,
      title: String(data.room.room_name || "未命名直播间"),
      owner: String(data.room.owner_name || ""),
      url: PLATFORMS.douyu.url(roomId),
    };
  }
  async function checkRoom(subscription, fetchImpl = fetch) {
    const item = normalizeSubscription(subscription);
    if (item.platform === "bilibili")
      return checkBilibili(item.roomId, fetchImpl);
    if (item.platform === "douyu") return checkDouyu(item.roomId, fetchImpl);
    throw new Error("不支持的平台。");
  }
  function buildNotification(subscription, status) {
    const name = roomName(subscription);
    const title = `${name} 开播了`;
    const message = status.title
      ? `${status.title}${status.owner ? ` · ${status.owner}` : ""}`
      : "打开房间观看直播。";
    return { title, message, url: status.url };
  }
  root.LiveOnAir = {
    PLATFORMS,
    parseRoom,
    normalizeSettings,
    normalizeSubscription,
    roomName,
    checkRoom,
    buildNotification,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
