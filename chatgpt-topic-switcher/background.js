chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "OPEN_NEW_CHAT") return;
  chrome.tabs.create({ url: "https://chatgpt.com/" }, (tab) => {
    if (!message.prompt) return;
    const listener = (tabId, changeInfo) => {
      if (tabId !== tab.id || changeInfo.status !== "complete") return;
      chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (prompt) => {
        const input = document.querySelector("#prompt-textarea") || document.querySelector("textarea") || document.querySelector('[contenteditable="true"]');
        if (!input) return;
        if ("value" in input) { const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set; setter?.call(input, prompt); } else input.textContent = prompt;
        input.dispatchEvent(new Event("input", { bubbles: true })); input.focus();
      }, args: [message.prompt] }).catch(() => {});
      chrome.tabs.onUpdated.removeListener(listener);
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
});
