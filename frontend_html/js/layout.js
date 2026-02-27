// layout.js (UPDATED)
// - Keeps your UI exactly same
// - Ensures page-specific handlers run AFTER the page HTML is injected
// - Ensures scripts like candidates.js (which exposes window.loadCandidates) can run reliably
// - Prevents duplicate calls when navigating between pages

async function loadLayout() {
  try {
    // Load sidebar
    const sidebarRes = await fetch("components/sidebar.html");
    const sidebarHtml = await sidebarRes.text();
    const sidebarContainer = document.getElementById("sidebar-container");
    if (sidebarContainer) sidebarContainer.innerHTML = sidebarHtml;

    // Load topbar
    const topbarRes = await fetch("components/topbar.html");
    const topbarHtml = await topbarRes.text();
    const topbarContainer = document.getElementById("topbar-container");
    if (topbarContainer) topbarContainer.innerHTML = topbarHtml;

    // Read page from URL
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page") || "dashboard";

    // Highlight correct sidebar link
    setActiveSidebar(page);

    // Load page content
    await loadPage(`pages/${page}.html`);

    if (window.lucide) {
      lucide.createIcons();
    }
  } catch (err) {
    console.error("Layout loading failed:", err);
  }
}

// ===============================
// LOAD PAGE CONTENT
// ===============================

let __lastLoadedPagePath = "";

async function loadPage(pagePath) {
  try {
    const response = await fetch(pagePath);
    if (!response.ok) throw new Error("Page not found");

    const html = await response.text();
    const container = document.getElementById("page-content");
    if (!container) return;

    // Avoid re-running same page injection (helps with accidental double calls)
    if (__lastLoadedPagePath === pagePath && container.innerHTML.trim()) {
      runPageHandler(pagePath);
      return;
    }
    __lastLoadedPagePath = pagePath;

    // Animation start
    container.style.opacity = 0;
    container.style.transform = "translateY(10px)";

    setTimeout(() => {
      container.innerHTML = html;

      container.style.transition = "all 0.3s ease";
      container.style.opacity = 1;
      container.style.transform = "translateY(0)";

      if (window.lucide) {
        lucide.createIcons();
      }

      // IMPORTANT: run handler AFTER HTML is injected
      runPageHandler(pagePath);
    }, 100);
  } catch (err) {
    console.error("Page loading failed:", err);
    const container = document.getElementById("page-content");
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <h2>Page Not Found</h2>
          <p>The requested page could not be loaded.</p>
        </div>
      `;
    }
  }
}

// ===============================
// PAGE HANDLER ROUTER
// ===============================

function runPageHandler(pagePath) {
  const pageHandlers = [
    { match: "dashboard.html", fn: "loadDashboardData" },
    { match: "job-description.html", fn: "loadJobDescriptionPage" },
    { match: "upload.html", fn: "loadUploadPage" },
    { match: "candidates.html", fn: "loadCandidates" },
    { match: "candidate-resume.html", fn: "loadCandidateResumePage" },
  ];

  for (const { match, fn } of pageHandlers) {
    if (!pagePath.includes(match)) continue;

    // Wait a tick to ensure any global scripts finished registering functions
    setTimeout(() => {
      if (typeof window[fn] === "function") {
        try {
          window[fn]();
        } catch (e) {
          console.error(`Error running ${fn}:`, e);
        }
      } else {
        // Do not throw; some pages may not ship that JS in some builds
        console.warn(`Handler not found: ${fn}`);
      }
    }, 0);

    break;
  }
}

// ===============================
// SET ACTIVE SIDEBAR
// ===============================

function setActiveSidebar(page) {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");

    const href = link.getAttribute("href");
    if (href && href.includes(`page=${page}`)) {
      link.classList.add("active");
    }
  });
}

// ===============================
// START APP
// ===============================

document.addEventListener("DOMContentLoaded", loadLayout);