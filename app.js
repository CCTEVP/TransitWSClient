const wsUrlInput = document.getElementById("wsUrl");
const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");
const messagesEl = document.getElementById("messages");

let socket = null;

function setStatus(text, connected) {
  statusEl.textContent = text;
  statusEl.classList.toggle("connected", connected);
  statusEl.classList.toggle("disconnected", !connected);

  connectBtn.disabled = connected;
  disconnectBtn.disabled = !connected;
}

function appendMessage(text) {
  // Keep only the latest client entry visible.
  messagesEl.textContent = "";

  const row = document.createElement("div");
  row.className = "message";

  const stamp = document.createElement("span");
  stamp.className = "timestamp";
  stamp.textContent = `[${new Date().toLocaleTimeString()}]`;

  const content = document.createElement("span");
  content.textContent = text;

  row.appendChild(stamp);
  row.appendChild(content);
  messagesEl.appendChild(row);
}

function connect() {
  const url = wsUrlInput.value.trim();
  if (!url) {
    appendMessage("Please provide a valid WebSocket URL.");
    return;
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    appendMessage("Already connected.");
    return;
  }

  try {
    socket = new WebSocket(url);
  } catch (error) {
    appendMessage(`Connection setup failed: ${error.message}`);
    return;
  }

  setStatus("Connecting...", false);
  appendMessage(`Connecting to ${url}`);

  socket.addEventListener("open", () => {
    setStatus("Connected", true);
    appendMessage("WebSocket connection opened.");
  });

  socket.addEventListener("message", (event) => {
    const data =
      typeof event.data === "string" ? event.data : "[binary message]";
    appendMessage(`Received: ${data}`);
  });

  socket.addEventListener("close", (event) => {
    setStatus("Disconnected", false);
    appendMessage(
      `Connection closed (code ${event.code}${event.reason ? `, reason: ${event.reason}` : ""}).`,
    );
    socket = null;
  });

  socket.addEventListener("error", () => {
    appendMessage("WebSocket error occurred. See browser console for details.");
  });
}

function disconnect() {
  if (!socket) {
    appendMessage("No active connection to close.");
    return;
  }

  socket.close(1000, "Client disconnect");
}

connectBtn.addEventListener("click", connect);
disconnectBtn.addEventListener("click", disconnect);
clearBtn.addEventListener("click", () => {
  messagesEl.textContent = "";
});

setStatus("Disconnected", false);
appendMessage("Ready. Click Connect to start listening for server messages.");
