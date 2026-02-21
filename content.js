(function() {
  let isRunning = false;
  let clickInterval = null;
  let clickCount = 0;
  let maxClicks = null;
  let intervalMs = 200;
  let stopKey = "e";

  let panel = null;
  let countDisplay = null;
  let speedDisplay = null;
  let intervalInput = null;
  let startButton = null;
  let stopButton = null;
  let statusText = null;
  let themeToggle = null;
  let themeLabel = null;

  // zda je panel aktivní (zobrazený)
  let panelActive = false;

  // drag state
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  // Cursor position
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Load theme from storage
  function loadTheme(callback) {
    if (!chrome.storage || !chrome.storage.sync) {
      callback("dark");
      return;
    }
    chrome.storage.sync.get({ acTheme: "dark" }, (data) => {
      callback(data.acTheme || "dark");
    });
  }

  function saveTheme(theme) {
    if (!chrome.storage || !chrome.storage.sync) return;
    chrome.storage.sync.set({ acTheme: theme });
  }

  function applyTheme(theme) {
    if (!panel) return;
    panel.dataset.theme = theme;
    if (themeLabel) {
      themeLabel.textContent = theme === "dark" ? "Dark" : "Light";
    }
  }

  // Panel in the bottom-right corner – created after show_panel
  function createPanel() {
    if (panel) {
      panel.style.display = "block";
      panelActive = true;
      return;
    }

    panel = document.createElement("div");
    panel.id = "ac-panel";
    panel.innerHTML = `
      <div id="ac-header">
        <div id="ac-title">Auto Clicker</div>
        <div id="ac-theme-toggle">
          <span id="ac-theme-label">Dark</span>
          <span id="ac-theme-knob"></span>
        </div>
        <div id="ac-close">×</div>
      </div>
      <div id="ac-body">
        <div id="ac-status">Ready</div>
        <div id="ac-count">Clicks: 0</div>
        <div id="ac-speed">
          <input id="ac-interval" type="number" value="${intervalMs}" min="10" step="10"> ms
        </div>
        <div id="ac-controls">
          <button id="ac-start">Start</button>
          <button id="ac-stop" disabled>Stop</button>
        </div>
        <div id="ac-hint">
          Press <kbd>P</kbd> to start, Press <kbd>${stopKey.toUpperCase()}</kbd> to stop
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    panelActive = true;

    countDisplay = panel.querySelector("#ac-count");
    speedDisplay = panel.querySelector("#ac-speed");
    intervalInput = panel.querySelector("#ac-interval");
    startButton = panel.querySelector("#ac-start");
    stopButton = panel.querySelector("#ac-stop");
    statusText = panel.querySelector("#ac-status");
    themeToggle = panel.querySelector("#ac-theme-toggle");
    themeLabel = panel.querySelector("#ac-theme-label");

    const closeBtn = panel.querySelector("#ac-close");
    closeBtn.addEventListener("click", () => {
      panel.style.display = "none";
      panelActive = false;
    });

    // dragging via header
    const header = panel.querySelector("#ac-header");
    header.addEventListener("mousedown", (e) => {
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const x = e.clientX - dragOffsetX;
      const y = e.clientY - dragOffsetY;
      panel.style.left = x + "px";
      panel.style.top = y + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.userSelect = "";
    });

    startButton.addEventListener("click", startAutoClick);
    stopButton.addEventListener("click", stopAutoClick);

    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        const newTheme = panel.dataset.theme === "light" ? "dark" : "light";
        applyTheme(newTheme);
        saveTheme(newTheme);
      });
    }

    loadTheme((theme) => {
      applyTheme(theme);
    });

    updateUI();
  }

  function updateCount() {
    if (countDisplay) {
      countDisplay.textContent = "Clicks: " + clickCount;
    }
  }

  function updateSpeed() {
    if (intervalInput) {
      intervalInput.value = intervalMs;
    }
  }

  function updateStatus(text) {
    if (statusText) {
      statusText.textContent = text;
    }
  }

  function updateUI() {
    if (!startButton || !stopButton) return;
    startButton.disabled = isRunning;
    stopButton.disabled = !isRunning;
    updateCount();
    updateSpeed();
    updateStatus(isRunning ? "Running" : "Ready");
  }

  // Click at current cursor position
  function performClick() {
    const el = document.elementFromPoint(mouseX, mouseY);
    if (!el) return;

    const options = {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 0,
      clientX: mouseX,
      clientY: mouseY,
    };

    const down = new MouseEvent("mousedown", options);
    const up = new MouseEvent("mouseup", options);
    const click = new MouseEvent("click", options);

    el.dispatchEvent(down);
    el.dispatchEvent(up);
    el.dispatchEvent(click);
  }

  function startAutoClick() {
    if (isRunning) return;

    if (intervalInput) {
      const v = parseInt(intervalInput.value, 10);
      if (!isNaN(v) && v >= 10) {
        intervalMs = v;
      }
    }

    isRunning = true;
    clickCount = 0;
    updateUI();

    clickInterval = setInterval(() => {
      if (maxClicks !== null && clickCount >= maxClicks) {
        stopAutoClick();
        return;
      }
      performClick();
      clickCount++;
      updateCount();
    }, intervalMs);
  }

  function stopAutoClick() {
    if (!isRunning) return;
    isRunning = false;
    clearInterval(clickInterval);
    clickInterval = null;
    updateUI();
  }

  // Start with key P, stop with key E – jen když je panel aktivní
  document.addEventListener("keydown", (e) => {
    if (!panelActive) return;

    const key = e.key.toLowerCase();

    if (key === "p") {
      startAutoClick();
    } else if (key === stopKey.toLowerCase()) {
      stopAutoClick();
    }
  });

  // Listener for message from popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "show_panel") {
      createPanel();
    }
  });
})();

