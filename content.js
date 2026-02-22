(function() {
    let isRunning = false;
    let clickInterval = null;
    let clickCount = 0;
    let intervalMs = 200;
    let stopKey = "e";
    let startKey = "p"; 
    let panel = null;
    let countDisplay = null;
    let intervalInput = null;
    let startButton = null;
    let stopButton = null;
    let statusText = null;
    let themeToggle = null;
    let themeLabel = null;
    let panelActive = false;

    // Sledování myši pro cíl klikání
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    
    // Minimalistický globální listener (pouze aktualizuje souřadnice, nebrzdí prohlížeč)
    document.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Proměnné pro Drag & Drop
    let dragStartX = 0;
    let dragStartY = 0;
    let panelStartX = 0;
    let panelStartY = 0;

    // Funkce pro tažení panelu
    function onDragMove(e) {
        e.preventDefault();
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        panel.style.left = (panelStartX + dx) + "px";
        panel.style.top = (panelStartY + dy) + "px";
    }

    // Funkce pro puštění panelu
    function onDragEnd() {
        // Po puštění myši přestaneme zbytečně naslouchat událostem pohybu pro tažení
        document.removeEventListener("mousemove", onDragMove);
        document.removeEventListener("mouseup", onDragEnd);
        const header = document.getElementById("ac-header");
        if (header) header.style.cursor = "grab";
    }

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
        
        // Změna barvy horního popisku podle režimu, aby nebyl tmavý
        const hintTitle = document.getElementById("ac-hint-title");
        if (hintTitle) {
            hintTitle.style.color = theme === "dark" ? "#cbd5e1" : "#4b5563";
        }
    }

    function createPanel() {
        if (panel) {
            panel.style.display = "block";
            panelActive = true;
            return;
        }

        panel = document.createElement("div");
        panel.id = "ac-panel";
        panel.innerHTML = `
            <div id="ac-header" style="cursor: grab; user-select: none;">
                <div id="ac-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #22c55e;"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4l3 3"></path></svg>
                    <span>AUTO CLICKER</span>
                </div>
                <div id="ac-close" style="cursor: pointer;">&times;</div>
            </div>
            <div id="ac-body">
                <div id="ac-status">Status: <span id="ac-status-text">Ready</span></div>
                <div id="ac-count">Clicks: <span id="ac-count-num">0</span></div>
                <div id="ac-speed">
                    Speed: <input type="number" id="ac-interval" value="200" min="10"> ms
                </div>
                <div id="ac-controls">
                    <button id="ac-start">START</button>
                    <button id="ac-stop" disabled>STOP</button>
                </div>
                
                <div id="ac-hint" style="color: currentColor;">
                    <div id="ac-hint-title" style="font-size: 11px; margin-bottom: 8px; text-align: center; font-weight: 500;">
                        Press combination to control clicking:
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-left: 20px;">
                            <span style="font-weight: 600; font-size: 13px; width: 40px; text-align: right;">Start:</span> 
                            <span style="display: flex; gap: 4px; align-items: center;"><kbd>Ctrl</kbd> + <kbd>P</kbd></span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-left: 20px;">
                            <span style="font-weight: 600; font-size: 13px; width: 40px; text-align: right;">Stop:</span> 
                            <span style="display: flex; gap: 4px; align-items: center;"><kbd>Ctrl</kbd> + <kbd>E</kbd></span>
                        </div>
                    </div>
                </div>
                
                <div class="ac-divider"></div>
                <div class="ac-footer">
                    <div class="ac-footer-info">
                        <span class="ac-badge">v1.0.1</span>
                        <div class="ac-credits">
                            CREATED BY <span class="ac-brand">BINOP</span>
                        </div>
                    </div>
                    <div id="ac-theme-toggle">
                        <div id="ac-theme-knob"></div>
                        <span id="ac-theme-label">Dark</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        panelActive = true;

        statusText = document.getElementById("ac-status-text");
        countDisplay = document.getElementById("ac-count-num");
        intervalInput = document.getElementById("ac-interval");
        startButton = document.getElementById("ac-start");
        stopButton = document.getElementById("ac-stop");
        themeToggle = document.getElementById("ac-theme-toggle");
        themeLabel = document.getElementById("ac-theme-label");
        const header = document.getElementById("ac-header");

        loadTheme((t) => applyTheme(t));

        // Nastavení Drag & Drop POUZE po stisku tlačítka myši
        header.addEventListener("mousedown", (e) => {
            if (e.target.id === "ac-close") return;

            dragStartX = e.clientX;
            dragStartY = e.clientY;

            const rect = panel.getBoundingClientRect();
            panelStartX = rect.left;
            panelStartY = rect.top;

            panel.style.right = "auto";
            panel.style.bottom = "auto";
            panel.style.left = panelStartX + "px";
            panel.style.top = panelStartY + "px";
            panel.style.margin = "0";

            header.style.cursor = "grabbing";

            // Listenery pro tažení aktivujeme až nyní
            document.addEventListener("mousemove", onDragMove);
            document.addEventListener("mouseup", onDragEnd);
        });

        document.getElementById("ac-close").onclick = () => {
            stopClicking(); 
            panel.style.display = "none";
            panelActive = false;
        };

        themeToggle.onclick = () => {
            const current = panel.dataset.theme;
            const next = current === "dark" ? "light" : "dark";
            applyTheme(next);
            saveTheme(next);
        };

        startButton.onclick = startClicking;
        stopButton.onclick = stopClicking;

        intervalInput.onchange = () => {
            intervalMs = parseInt(intervalInput.value) || 200;
        };
    }

    function startClicking() {
        if (isRunning) return;
        isRunning = true;
        startButton.disabled = true;
        stopButton.disabled = false;
        statusText.textContent = "Running...";
        statusText.style.color = "#22c55e";

        clickInterval = setInterval(() => {
            const el = document.elementFromPoint(mouseX, mouseY);
            if (el) {
                // Konfigurace pro bublající události, které projdou celým DOMem
                const eventProps = {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: mouseX,
                    clientY: mouseY
                };
                
                // Nasimulujeme reálnou sekvenci kliknutí (Pointer + Mouse Events)
                el.dispatchEvent(new PointerEvent('pointerdown', eventProps));
                el.dispatchEvent(new MouseEvent('mousedown', eventProps));
                el.dispatchEvent(new PointerEvent('pointerup', eventProps));
                el.dispatchEvent(new MouseEvent('mouseup', eventProps));
                el.dispatchEvent(new MouseEvent('click', eventProps));

                clickCount++;
                countDisplay.textContent = clickCount;
            }
        }, intervalMs);
    }

    function stopClicking() {
        if (!isRunning) return;
        isRunning = false;
        clearInterval(clickInterval);
        startButton.disabled = false;
        stopButton.disabled = true;
        statusText.textContent = "Stopped";
        statusText.style.color = "#ef4444";
    }

    document.addEventListener("keydown", (e) => {
        if (!panelActive) return;

        // Zabrání spuštění/vypnutí, pokud zrovna píšeš do inputu (např. upravuješ rychlost)
        if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
        
        const key = e.key.toLowerCase();
        
        if (e.ctrlKey && key === stopKey && isRunning) {
            e.preventDefault();
            stopClicking();
        } else if (e.ctrlKey && key === startKey && !isRunning) {
            e.preventDefault();
            startClicking();
        }
    });

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "show_panel") createPanel();
    });
})();
