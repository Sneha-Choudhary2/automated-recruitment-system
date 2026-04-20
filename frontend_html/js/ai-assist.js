(() => {
  const API = (window.API_BASE || window.API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

  function normalizePageName(raw) {
    const value = String(raw || "").toLowerCase().trim();

    if (!value) return "dashboard";

    if (value.includes("upload")) return "upload";
    if (value.includes("job") || value.includes("jd")) return "jd";
    if (value.includes("candidate")) return "candidates";
    if (value.includes("resume")) return "resume";
    if (value.includes("dashboard") || value.includes("home") || value.includes("index")) return "dashboard";

    return value;
  }

  function detectPageFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const queryPage = params.get("page");
    if (queryPage) return normalizePageName(queryPage);

    const path = window.location.pathname.toLowerCase();

    if (path.includes("upload")) return "upload";
    if (path.includes("job") || path.includes("jd")) return "jd";
    if (path.includes("candidate")) return "candidates";
    if (path.includes("resume")) return "resume";
    if (path.includes("dashboard") || path.endsWith("/") || path.endsWith("/index.html")) return "dashboard";

    const fileName = path.split("/").pop() || "";
    return normalizePageName(fileName.replace(".html", ""));
  }

  function getCurrentPageName() {
    return detectPageFromLocation();
  }

  function getDefaultContext() {
    return {
      page: getCurrentPageName(),
      candidate_name: null,
      resume_text: null,
      jd_text: null,
      matched_skills: [],
      missing_skills: [],
      score: null,
      candidates: [],
      jobs: []
    };
  }

  function getPageContext() {
    try {
      if (typeof window.getAIChatContext === "function") {
        const ctx = window.getAIChatContext();
        return { ...getDefaultContext(), ...(ctx || {}), page: normalizePageName((ctx || {}).page || getCurrentPageName()) };
      }
    } catch (err) {
      console.error("getAIChatContext error:", err);
    }
    return getDefaultContext();
  }

  function createStyles() {
    if (document.getElementById("ai-assist-styles")) return;

    const style = document.createElement("style");
    style.id = "ai-assist-styles";
    style.textContent = `
      .ai-chat-fab {
        position: fixed;
        right: 20px;
        bottom: 20px;
        width: 56px;
        height: 56px;
        border: none;
        border-radius: 50%;
        background: #111827;
        color: #fff;
        cursor: pointer;
        font-size: 22px;
        z-index: 9999;
        box-shadow: 0 10px 24px rgba(0,0,0,0.18);
      }

      .ai-chat-panel {
        position: fixed;
        right: 20px;
        bottom: 88px;
        width: 360px;
        max-width: calc(100vw - 32px);
        height: 520px;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 16px 40px rgba(0,0,0,0.18);
        display: none;
        flex-direction: column;
        overflow: hidden;
        z-index: 9999;
        border: 1px solid #e5e7eb;
      }

      .ai-chat-panel.open {
        display: flex;
      }

      .ai-chat-header {
        padding: 14px 16px;
        background: #111827;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 600;
      }

      .ai-chat-close {
        border: none;
        background: transparent;
        color: #fff;
        cursor: pointer;
        font-size: 20px;
      }

      .ai-chat-body {
        flex: 1;
        padding: 12px;
        overflow-y: auto;
        background: #f9fafb;
      }

      .ai-chat-msg {
        margin-bottom: 10px;
        max-width: 88%;
        padding: 10px 12px;
        border-radius: 12px;
        line-height: 1.45;
        font-size: 14px;
        white-space: pre-wrap;
      }

      .ai-chat-msg.user {
        margin-left: auto;
        background: #111827;
        color: #fff;
      }

      .ai-chat-msg.bot {
        margin-right: auto;
        background: #fff;
        color: #111827;
        border: 1px solid #e5e7eb;
      }

      .ai-chat-footer {
        display: flex;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid #e5e7eb;
        background: #fff;
      }

      .ai-chat-input {
        flex: 1;
        border: 1px solid #d1d5db;
        border-radius: 10px;
        padding: 10px 12px;
        outline: none;
      }

      .ai-chat-send {
        border: none;
        background: #111827;
        color: #fff;
        border-radius: 10px;
        padding: 10px 14px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function addMessage(body, text, type) {
    const msg = document.createElement("div");
    msg.className = `ai-chat-msg ${type}`;
    msg.textContent = text;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
    return msg;
  }

  async function sendMessage(input, body, sendBtn) {
    const message = (input.value || "").trim();
    if (!message) return;

    addMessage(body, message, "user");
    input.value = "";
    sendBtn.disabled = true;

    const thinkingMsg = addMessage(body, "Thinking...", "bot");

    try {
      const context = getPageContext();
      console.log("AI Assist context:", context);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${API}/ai-assist/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      let data = null;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error("AI Assist invalid JSON:", jsonErr);
      }

      console.log("AI Assist response:", data);

      if (!res.ok) {
        throw new Error(data?.detail || data?.answer || `HTTP ${res.status}`);
      }

      thinkingMsg.textContent = data?.answer || "I did not get a valid reply.";
    } catch (err) {
      console.error("AI Assist error:", err);
      thinkingMsg.textContent =
        err.name === "AbortError"
          ? "The chatbot took too long to respond. Check if backend is running."
          : `Chatbot error: ${err.message || "Unknown error"}`;
    } finally {
      sendBtn.disabled = false;
    }
  }

  function initAIChat() {
    if (document.getElementById("ai-chat-fab")) return;

    createStyles();

    const fab = document.createElement("button");
    fab.id = "ai-chat-fab";
    fab.className = "ai-chat-fab";
    fab.title = "AI Assist";
    fab.innerHTML = "💬";

    const panel = document.createElement("div");
    panel.className = "ai-chat-panel";
    panel.id = "ai-chat-panel";

    panel.innerHTML = `
      <div class="ai-chat-header">
        <span>AI Assist</span>
        <button class="ai-chat-close" id="ai-chat-close">&times;</button>
      </div>
      <div class="ai-chat-body" id="ai-chat-body"></div>
      <div class="ai-chat-footer">
        <input
          id="ai-chat-input"
          class="ai-chat-input"
          type="text"
          placeholder="Ask about upload, jobs, candidates, resume, score..."
        />
        <button id="ai-chat-send" class="ai-chat-send">Send</button>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    const body = document.getElementById("ai-chat-body");
    const input = document.getElementById("ai-chat-input");
    const sendBtn = document.getElementById("ai-chat-send");
    const closeBtn = document.getElementById("ai-chat-close");

    addMessage(
      body,
      "Hi. I am your ATS assistant. You can ask how to upload resumes, how job descriptions work, what the candidates page does, what the resume page shows, ranking, score, matched skills, missing skills, saved jobs, deadlines, filters, export, delete, and candidate or resume details when available.",
      "bot"
    );

    fab.addEventListener("click", () => {
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) input.focus();
    });

    closeBtn.addEventListener("click", () => {
      panel.classList.remove("open");
    });

    sendBtn.addEventListener("click", () => sendMessage(input, body, sendBtn));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMessage(input, body, sendBtn);
    });
  }

  window.initAIChat = initAIChat;
})();