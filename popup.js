document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("open-panel");

  btn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;

      chrome.tabs.sendMessage(tabs[0].id, { action: "show_panel" });

      // zavřít popup okno rozšíření po kliknutí na Start
      window.close();
    });
  });
});
