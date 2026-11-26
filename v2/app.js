// Server selection, from the page URL:
//   ?server=local   -> ws://localhost:8282
//   ?server=remote  -> Cloud Run (SERVER_PRESETS.remote)
//   ?server=<host[:port]> or ?server=<ws/wss/http/https URL>
// Default: local when this page is opened from a file or localhost, otherwise remote.
const SERVER_PRESETS = {
  local: "ws://localhost:8282",
  remote: "wss://transitproject-763503917257.europe-west1.run.app",
};

function resolveServerBase() {
  const choice = new URLSearchParams(location.search).get("server");
  if (!choice) {
    return location.protocol === "file:" ||
      ["", "localhost", "127.0.0.1", "[::1]"].includes(location.hostname)
      ? SERVER_PRESETS.local
      : SERVER_PRESETS.remote;
  }
  if (SERVER_PRESETS[choice]) {
    return SERVER_PRESETS[choice];
  }
  const trimmed = choice.trim().replace(/\/+$/, "").replace(/\/(content|control)$/i, "");
  if (/^wss?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^http/i, "ws");
  }
  return `${location.protocol === "https:" ? "wss" : "ws"}://${trimmed}`;
}

const WS_URL = `${resolveServerBase()}/content`;
const RECONNECT_DELAY_MS = 3000;
const HEARTBEAT_TIMEOUT_MS = 35000;

const commandImageMap = {
  RET_NO_TRAIN: "images/no-train.jpg",
  RET_TRAIN_ARRIVING_15S: "images/train-arriving.jpg",
  RET_TRAIN_ARRIVED: "images/train-arrived.jpg",
  RET_TRAIN_DEPARTED: "images/train-departed.jpg",
};

const stateImage = document.getElementById("stateImage");
const overlay = document.getElementById("overlay");
const overlayStatus = document.getElementById("overlayStatus");

let socket = null;
let reconnectTimer = null;
let heartbeatTimer = null;

function showOverlay(text, cssClass) {
  overlayStatus.textContent = text;
  overlay.className = "overlay " + (cssClass || "");
}

function hideOverlay() {
  overlay.className = "overlay hidden";
}

function setImage(command) {
  const src = commandImageMap[command];
  if (!src) return;

  stateImage.style.opacity = "0";
  setTimeout(() => {
    stateImage.src = src;
    stateImage.alt = command;
    stateImage.style.opacity = "1";
  }, 400);
}

function resetHeartbeat() {
  clearTimeout(heartbeatTimer);
  heartbeatTimer = setTimeout(() => {
    console.log("[WS] No heartbeat received, reconnecting...");
    if (socket) socket.close();
  }, HEARTBEAT_TIMEOUT_MS);
}

function cleanup() {
  clearTimeout(heartbeatTimer);
  socket = null;
}

function connect() {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  try {
    socket = new WebSocket(WS_URL);
  } catch (e) {
    scheduleReconnect();
    return;
  }

  socket.addEventListener("open", () => {
    hideOverlay();
    resetHeartbeat();
    console.log("[WS] Connected to", WS_URL);
  });

  socket.addEventListener("message", (event) => {
    resetHeartbeat();

    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    if (msg.type === "transit-command" && commandImageMap[msg.command]) {
      setImage(msg.command);
    }
  });

  socket.addEventListener("close", () => {
    cleanup();
    showOverlay("Disconnected — reconnecting...", "disconnected");
    scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    if (socket) socket.close();
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_DELAY_MS);
}

setImage("RET_NO_TRAIN");
connect();
