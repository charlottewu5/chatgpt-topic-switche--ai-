(() => {
  const STORAGE_KEY = "chatgpt_topic_state";
  const getInput = () => document.querySelector("#prompt-textarea") || document.querySelector("textarea") || document.querySelector('[contenteditable="true"]');
  const readInput = (input) => input?.value ?? input?.innerText ?? input?.textContent ?? "";
  function getConversationText() {
    const messages = [...document.querySelectorAll("main article")];
    return (messages.length ? messages.slice(-8).map((item) => item.innerText || "").join("\n") : document.body.innerText.slice(-12000));
  }
  function getKeywords(text) {
    const normalized = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, " ");
    const latin = normalized.match(/[a-z0-9]{2,}/g) || [];
    const chinese = [...normalized.matchAll(/[\u4e00-\u9fa5]{2,}/g)].flatMap(([s]) => [...s].map((_, i) => s.slice(i, i + 2)));
    return [...new Set([...latin, ...chinese])].slice(0, 150);
  }
  function calculateSimilarity(oldKeywords, newKeywords) {
    if (!oldKeywords.length || !newKeywords.length) return 1;
    const oldSet = new Set(oldKeywords);
    return newKeywords.filter((word) => oldSet.has(word)).length / newKeywords.length;
  }
  function createSummary(text) { return `这是一个新主题，请不要继承之前无关的讨论。\n\n当前对话背景（最近摘录）：\n${text.slice(-3000)}\n\n请只围绕接下来提出的新问题回答。`; }
  function showDecisionDialog(summary, similarity) {
    if (document.querySelector("#topic-switcher-dialog")) return;
    const overlay = document.createElement("div"); overlay.id = "topic-switcher-dialog";
    const box = document.createElement("div"); box.className = "topic-switcher-box";
    box.innerHTML = `<h3>可能检测到新主题</h3><p>当前消息与最近对话的相似度较低（${Math.round(similarity * 100)}%）。</p><div class="topic-switcher-actions"><button data-action="continue">继续当前对话</button><button data-action="new-tab">打开新标签页</button><button data-action="new-summary">新标签页并附带摘要</button></div>`;
    overlay.appendChild(box); document.body.appendChild(overlay);
    box.querySelector('[data-action="continue"]').onclick = () => overlay.remove();
    box.querySelector('[data-action="new-tab"]').onclick = () => { chrome.runtime.sendMessage({ type: "OPEN_NEW_CHAT", prompt: "" }); overlay.remove(); };
    box.querySelector('[data-action="new-summary"]').onclick = () => { chrome.runtime.sendMessage({ type: "OPEN_NEW_CHAT", prompt: summary }); overlay.remove(); };
  }
  function inspectMessage(message) {
    const previousState = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const similarity = calculateSimilarity(previousState.keywords || [], getKeywords(message));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ keywords: getKeywords(getConversationText()), updatedAt: Date.now() }));
    if (previousState.keywords?.length && similarity < 0.18) showDecisionDialog(createSummary(getConversationText()), similarity);
  }
  function attachInputListener() {
    const input = getInput(); if (!input || input.dataset.topicSwitcherAttached) return;
    input.dataset.topicSwitcherAttached = "true";
    input.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { const message = readInput(input).trim(); if (message) setTimeout(() => inspectMessage(message), 800); } });
  }
  const style = document.createElement("style"); style.textContent = `#topic-switcher-dialog{position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center}.topic-switcher-box{width:min(440px,calc(100vw - 32px));background:white;color:#222;border-radius:14px;padding:22px;box-shadow:0 10px 40px rgba(0,0,0,.25);font-family:system-ui,sans-serif}.topic-switcher-box h3{margin-top:0}.topic-switcher-actions{display:flex;flex-direction:column;gap:8px;margin-top:18px}.topic-switcher-actions button{border:0;border-radius:8px;padding:10px 12px;cursor:pointer}button[data-action="new-summary"]{background:#10a37f;color:white}`; document.head.appendChild(style);
  new MutationObserver(attachInputListener).observe(document.documentElement, { childList: true, subtree: true }); attachInputListener();
})();
