const WS_URL = "ws://localhost:8080/content";
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
