const $ = (id) => document.getElementById(id);
let state = { subscriptions: [], settings: LiveOnAir.normalizeSettings() };
function status(text) {
  $("status").textContent = text;
}
async function send(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (!result?.ok) throw new Error(result?.error || "扩展还没有准备好。");
  return result.data;
}
function applySettings(settings) {
  $("interval").value = settings.intervalMinutes;
  $("desktop").checked = settings.desktop;
  $("phone").checked = settings.phone;
  $("topic").value = settings.ntfyTopic;
}
function render() {
  applySettings(state.settings);
  $("list").replaceChildren();
  if (!state.subscriptions.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "添加哔哩哔哩或斗鱼房间后，就可以开始监控开播状态。";
    $("list").append(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const item of state.subscriptions) {
    const card = document.createElement("article");
    card.className = "room";
    const head = document.createElement("div");
    head.className = "room-head";
    const title = document.createElement("h2");
    title.textContent = LiveOnAir.roomName(item);
    const platform = document.createElement("span");
    platform.className = "platform";
    platform.textContent = LiveOnAir.PLATFORMS[item.platform].name;
    head.append(title, platform);
    const meta = document.createElement("p");
    meta.className = "meta";
    const checked = item.lastCheckedAt
      ? new Date(item.lastCheckedAt).toLocaleString()
      : "还没有检查";
    meta.textContent = `${item.roomId} · ${item.lastTitle || "暂无标题"} · ${checked}`;
    const stateText = document.createElement("p");
    stateText.className = item.lastError
      ? "error"
      : item.lastLive
        ? "live"
        : "offline";
    stateText.textContent = item.lastError
      ? item.lastError
      : item.lastLive
        ? "正在直播"
        : "未开播";
    const actions = document.createElement("div");
    actions.className = "room-actions";
    const open = document.createElement("a");
    open.href = LiveOnAir.PLATFORMS[item.platform].url(item.roomId);
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    open.textContent = "打开房间";
    const right = document.createElement("div");
    const toggle = document.createElement("button");
    toggle.className = "secondary";
    toggle.textContent = item.enabled ? "暂停" : "恢复";
    toggle.onclick = async () => {
      await send({ type: "toggle", id: item.id });
      await refresh();
    };
    const remove = document.createElement("button");
    remove.className = "secondary";
    remove.textContent = "删除";
    remove.onclick = async () => {
      await send({ type: "remove", id: item.id });
      await refresh();
    };
    right.append(toggle, remove);
    actions.append(open, right);
    card.append(head, meta, stateText, actions);
    fragment.append(card);
  }
  $("list").append(fragment);
}
async function refresh() {
  state = await send({ type: "list" });
  render();
  status(`正在监控 ${state.subscriptions.length} 个房间。`);
}
$("add").onsubmit = async (event) => {
  event.preventDefault();
  try {
    status("正在添加前检查房间...");
    await send({
      type: "add",
      platform: document.querySelector('input[name="platform"]:checked').value,
      input: $("room").value,
      label: $("label").value,
    });
    $("room").value = "";
    $("label").value = "";
    await refresh();
  } catch (error) {
    status(error.message);
  }
};
$("save").onclick = async () => {
  try {
    const settings = LiveOnAir.normalizeSettings({
      intervalMinutes: $("interval").value,
      desktop: $("desktop").checked,
      phone: $("phone").checked,
      ntfyTopic: $("topic").value,
    });
    state = await send({ type: "settings", settings });
    render();
    status("设置已保存。");
  } catch (error) {
    status(error.message);
  }
};
$("check").onclick = async () => {
  try {
    $("check").disabled = true;
    status("正在检查房间...");
    await send({ type: "checkNow" });
    await refresh();
  } catch (error) {
    status(error.message);
  } finally {
    $("check").disabled = false;
  }
};
$("test-phone").onclick = async () => {
  try {
    status("正在发送手机测试提醒...");
    await send({ type: "testPhone" });
    status("手机测试提醒已发送。");
  } catch (error) {
    status(error.message);
  }
};
refresh().catch((error) => status(error.message));
