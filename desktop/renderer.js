(() => {
  const chatUrl = "http://localhost:8000/ui";
  const frame = document.getElementById("chatFrame");
  const stealthBtn = document.getElementById("stealthBtn");
  const openBrowserBtn = document.getElementById("openBrowserBtn");

  frame.src = chatUrl;

  function paintStealthState(enabled) {
    const on = Boolean(enabled);
    stealthBtn.textContent = `Прозрачный режим: ${on ? "вкл" : "выкл"}`;
    stealthBtn.classList.toggle("active", on);
  }

  stealthBtn.addEventListener("click", async () => {
    const next = await window.voiceflowDesktop.toggleStealth();
    paintStealthState(next);
  });

  openBrowserBtn.addEventListener("click", async () => {
    await window.voiceflowDesktop.openChatInBrowser();
  });

  window.voiceflowDesktop.onStealthState((state) => {
    paintStealthState(state);
  });

  window.voiceflowDesktop.getStealthState().then((state) => {
    paintStealthState(state);
  });
})();
