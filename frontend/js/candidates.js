const API_BASE = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", () => {
    setupTheme();
    loadCandidates();
});

async function loadCandidates() {
    const jobId = document.getElementById("jobIdInput").value;

    try {
        const res = await fetch(`${API_BASE}/ats/rank-resumes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                job_id: parseInt(jobId),
                top_n: 10
            })
        });

        const data = await res.json();

        if (!Array.isArray(data)) return;

        renderTable(data);

    } catch (err) {
        console.error("Error loading candidates:", err);
    }
}

function renderTable(data) {
    const table = document.getElementById("candidateTable");
    table.innerHTML = "";

    data.forEach(c => {

        let badgeClass = "score-low";

        if (c.match_score >= 70) badgeClass = "score-high";
        else if (c.match_score >= 50) badgeClass = "score-medium";

        table.innerHTML += `
            <tr>
                <td>#${c.rank}</td>
                <td>${c.resume_id}</td>
                <td>${c.filename}</td>
                <td>${c.match_score}%</td>
                <td>
                    <span class="score-badge ${badgeClass}">
                        ${getStatus(c.match_score)}
                    </span>
                </td>
            </tr>
        `;
    });
}

function getStatus(score) {
    if (score >= 70) return "Excellent";
    if (score >= 50) return "Good";
    return "Needs Improvement";
}

/* Theme */
function setupTheme() {
    const toggleBtn = document.getElementById("themeToggle");
    const saved = localStorage.getItem("theme");

    if (saved === "light") {
        document.body.classList.add("light-theme");
        toggleBtn.textContent = "☀️";
    }

    toggleBtn.addEventListener("click", () => {
        document.body.classList.toggle("light-theme");

        if (document.body.classList.contains("light-theme")) {
            localStorage.setItem("theme", "light");
            toggleBtn.textContent = "☀️";
        } else {
            localStorage.setItem("theme", "dark");
            toggleBtn.textContent = "🌙";
        }
    });
}
