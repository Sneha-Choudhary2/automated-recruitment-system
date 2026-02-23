// ===============================
// LOAD LAYOUT (Sidebar + Topbar)
// ===============================

async function loadLayout() {

    // Load sidebar
    const sidebar = await fetch("components/sidebar.html");
    document.getElementById("sidebar-container").innerHTML = await sidebar.text();

    // Load topbar
    const topbar = await fetch("components/topbar.html");
    document.getElementById("topbar-container").innerHTML = await topbar.text();

    // Read page from URL
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page") || "dashboard";

    // Highlight correct sidebar link
    setActiveSidebar(page);

    // Load correct page
    await loadPage(`pages/${page}.html`);

    if (window.lucide) {
        lucide.createIcons();
    }
}

// ===============================
// LOAD PAGE CONTENT
// ===============================

async function loadPage(pagePath) {

    const response = await fetch(pagePath);
    const html = await response.text();

    const container = document.getElementById("page-content");

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

        // Run page-specific JS AFTER content injected

        if (pagePath.includes("dashboard.html")) {
            if (typeof loadDashboardData === "function") {
                loadDashboardData();
            }
        }

        if (pagePath.includes("job-description.html")) {
            if (typeof loadJobDescriptionPage === "function") {
                loadJobDescriptionPage();
            }
        }
        if (pagePath.includes("upload.html")) {
    if (typeof loadUploadPage === "function") {
        loadUploadPage();
    }
}

    }, 100);
    
}

// ===============================
// SET ACTIVE SIDEBAR
// ===============================

function setActiveSidebar(page) {

    document.querySelectorAll(".nav-link").forEach(link => {

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