// js/api.js (UPDATED - backward compatible)
// - Keeps window.API_BASE
// - Adds small helpers used across pages
// - Normalizes base URL (no trailing slash)

(function () {
  const base = (window.API_BASE || window.API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
  window.API_BASE = base;

  const buildUrl = (endpoint) => {
    const ep = String(endpoint || "");
    if (!ep) return base;
    if (ep.startsWith("http://") || ep.startsWith("https://")) return ep;
    return base + (ep.startsWith("/") ? "" : "/") + ep;
  };

  async function safeJson(res) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async function request(method, endpoint, data, opts) {
    const url = buildUrl(endpoint);
    const init = {
      method,
      headers: {},
      ...opts,
    };

    if (data !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(data);
    }

    const res = await fetch(url, init);
    if (!res.ok) {
      const payload = await safeJson(res);
      const msg = payload?.detail || payload?.message || `${res.status} ${endpoint}`;
      const err = new Error(msg);
      err.status = res.status;
      err.payload = payload;
      throw err;
    }

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return await res.json();

    // non-json responses (downloads, plain text etc.)
    return await res.text();
  }

  // Backward compatible helpers
  window.apiGet = async function (endpoint, opts) {
    return await request("GET", endpoint, undefined, opts);
  };

  window.apiPost = async function (endpoint, data, opts) {
    return await request("POST", endpoint, data, opts);
  };

  // New helpers (optional)
  window.apiDelete = async function (endpoint, opts) {
    return await request("DELETE", endpoint, undefined, opts);
  };

  window.apiUrl = buildUrl;
})();