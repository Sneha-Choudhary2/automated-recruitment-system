async function loadDashboardData() {
    const totalEl = document.getElementById("totalCandidates");
    const avgEl = document.getElementById("avgMatch");
    const shortEl = document.getElementById("shortlisted");
    const dropdown = document.getElementById("jobDropdown");
    const container = document.getElementById("topCandidatesList");
    const currentTitle = document.getElementById("currentJobTitle");

    if (!dropdown || !container) return;

    bindDashboardButtons();

    try {
        const jobResponse = await fetch("http://127.0.0.1:8000/jobs/");
        const jobs = await jobResponse.json();

        if (!Array.isArray(jobs) || !jobs.length) {
            container.innerHTML = "<p>No jobs available.</p>";
            if (totalEl) totalEl.textContent = "0";
            if (avgEl) avgEl.textContent = "0%";
            if (shortEl) shortEl.textContent = "0";
            await loadActiveJobs();
            return;
        }

        dropdown.innerHTML = "";

        jobs.forEach((job) => {
            const option = document.createElement("option");
            option.value = job.id;
            option.textContent = job.title;
            dropdown.appendChild(option);
        });

        const defaultJob = jobs[0];
        dropdown.value = defaultJob.id;
        currentTitle.textContent = defaultJob.title;

        await loadRanking(defaultJob.id);

        dropdown.onchange = async (e) => {
            const jobId = e.target.value;
            const selected = jobs.find((j) => String(j.id) === String(jobId));
            currentTitle.textContent = selected?.title || "Selected Job";
            await loadRanking(jobId);
        };

        await loadActiveJobs();

        const manageBtn = document.getElementById("manageJobsBtn");
        if (manageBtn) {
            manageBtn.onclick = () => {
                if (typeof loadPage === "function") {
                    loadPage("pages/job-description.html");
                } else {
                    window.location.href = "index.html?page=job-description";
                }
            };
        }

    } catch (error) {
        console.error("Dashboard load error:", error);
        container.innerHTML = "<p>Error loading dashboard.</p>";
    }
}

function bindDashboardButtons() {
    const quickButtons = document.querySelectorAll(".quick-actions .quick-btn");

    quickButtons.forEach((btn) => {
        const text = (btn.textContent || "").trim().toLowerCase();

        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (text.includes("upload")) {
                goToPage("upload");
                return;
            }

            if (text.includes("create job")) {
                goToPage("job-description");
                return;
            }

            if (text.includes("view rankings")) {
                goToPage("candidates");
            }
        };
    });
}

function goToPage(page) {
    const pagePathMap = {
        upload: "pages/upload.html",
        "job-description": "pages/job-description.html",
        candidates: "pages/candidates.html",
        dashboard: "pages/dashboard.html"
    };

    const pagePath = pagePathMap[page];

    if (typeof loadPage === "function" && pagePath) {
        const url = new URL(window.location.href);
        url.searchParams.set("page", page);
        window.history.pushState({}, "", url.toString());

        if (typeof setActiveSidebar === "function") {
            setActiveSidebar(page);
        }

        loadPage(pagePath);
    } else {
        window.location.href = `index.html?page=${page}`;
    }
}

async function loadRanking(jobId) {
    const totalEl = document.getElementById("totalCandidates");
    const avgEl = document.getElementById("avgMatch");
    const shortEl = document.getElementById("shortlisted");
    const container = document.getElementById("topCandidatesList");

    if (!container) return;
    container.innerHTML = "Loading...";

    try {
        const ranked = await apiPost("/ats/rank-resumes", {
            job_id: parseInt(jobId),
            top_n: 5
        });

        const resumes = await apiGet("/resumes/");

        let totalScore = 0;
        let shortlisted = 0;

        container.innerHTML = "";

        ranked.forEach((candidate) => {
            totalScore += Number(candidate.match_score || 0);
            if (Number(candidate.match_score || 0) >= 50) shortlisted++;

            const resume = resumes.find((r) => Number(r.id) === Number(candidate.resume_id));

            const rawName =
                resume?.candidate_name ||
                candidate.candidate_name ||
                candidate.filename ||
                "Candidate";

            const name = String(rawName)
                .replace(/\.(pdf|docx?|txt)$/i, "")
                .replace(/[_\-]+/g, " ")
                .trim();

            let skills = "Skills detected";
            if (Array.isArray(candidate.matched_skills) && candidate.matched_skills.length) {
                skills = candidate.matched_skills.slice(0, 3).join(", ");
            } else if (Array.isArray(resume?.skills) && resume.skills.length) {
                skills = resume.skills.slice(0, 3).join(", ");
            }

            const row = document.createElement("div");
            row.className = "candidate-row";

            row.innerHTML = `
                <div class="rank-circle">#${candidate.rank}</div>
                <div class="candidate-details">
                    <div class="candidate-name">${name}</div>
                    <div class="candidate-sub">${skills}</div>
                </div>
                <div class="candidate-score">
                    <div class="score-value">${Number(candidate.match_score || 0).toFixed(1)}%</div>
                    <div class="score-label">Match Score</div>
                </div>
            `;

            container.appendChild(row);
        });

        const avgScore = ranked.length ? (totalScore / ranked.length).toFixed(1) : "0.0";

        if (totalEl) totalEl.textContent = ranked.length;
        if (avgEl) avgEl.textContent = avgScore + "%";
        if (shortEl) shortEl.textContent = shortlisted;

        if (!ranked.length) {
            container.innerHTML = "<p>No ranked candidates found.</p>";
        }
    } catch (error) {
        console.error("Ranking error:", error);
        container.innerHTML = "<p>Error loading candidates.</p>";
    }
}

async function loadActiveJobs() {
    const container = document.getElementById("activeJobsList");
    const activeJobsEl = document.getElementById("activeJobs");

    if (!container) return;

    try {
        const response = await fetch("http://127.0.0.1:8000/jobs/");
        const jobs = await response.json();

        if (activeJobsEl) {
            activeJobsEl.textContent = Array.isArray(jobs) ? jobs.length : 0;
        }

        container.innerHTML = "";

        if (!Array.isArray(jobs) || !jobs.length) {
            container.innerHTML = "<p>No active jobs found.</p>";
            return;
        }

        jobs.forEach((job) => {
            const jobCard = document.createElement("div");
            jobCard.className = "job-card";

            jobCard.innerHTML = `
                <div class="job-header">
                    <div class="job-title">${job.title}</div>
                    <div class="job-id">#${job.id}</div>
                </div>

                <div class="job-desc">
                    ${(job.raw_text || "").substring(0, 120)}${(job.raw_text || "").length > 120 ? "..." : ""}
                </div>

                <div class="job-footer">
                    Deadline: ${job.application_deadline ? job.application_deadline.split("T")[0] : "Not set"}
                </div>
            `;

            container.appendChild(jobCard);
        });
    } catch (error) {
        console.error("Active jobs load error:", error);
        container.innerHTML = "<p>Error loading active jobs.</p>";
    }
}

window.addEventListener("focus", async () => {
    const dropdown = document.getElementById("jobDropdown");
    if (!dropdown) return;

    const jobId = dropdown.value;
    if (jobId) {
        await loadRanking(jobId);
        await loadActiveJobs();
    }
});

window.getAIChatContext = function () {
    try {
        const totalCandidates = document.getElementById("totalCandidates")?.textContent?.trim() || "0";
        const activeJobs = document.getElementById("activeJobs")?.textContent?.trim() || "0";
        const avgMatch = document.getElementById("avgMatch")?.textContent?.trim() || "0%";
        const shortlisted = document.getElementById("shortlisted")?.textContent?.trim() || "0";
        const currentJobTitle = document.getElementById("currentJobTitle")?.textContent?.trim() || "";

        const topCandidateRows = Array.from(document.querySelectorAll("#topCandidatesList .candidate-row"));
        const candidates = topCandidateRows.map((row) => {
            const name = row.querySelector(".candidate-name")?.textContent?.trim() || "";
            const sub = row.querySelector(".candidate-sub")?.textContent?.trim() || "";
            const scoreText = row.querySelector(".score-value")?.textContent?.trim() || "0";
            const score = Number(String(scoreText).replace("%", "").trim()) || 0;

            const matchedSkills = sub && sub !== "Skills detected"
                ? sub.split(",").map((s) => s.trim()).filter(Boolean)
                : [];

            return {
                name,
                candidate_name: name,
                score,
                matched_skills: matchedSkills,
                missing_skills: []
            };
        });

        const jobs = Array.from(document.querySelectorAll("#activeJobsList .job-card")).map((card) => {
            const title = card.querySelector(".job-title")?.textContent?.trim() || "";
            const desc = card.querySelector(".job-desc")?.textContent?.trim() || "";
            const footer = card.querySelector(".job-footer")?.textContent?.trim() || "";

            return {
                title,
                raw_text: desc,
                application_deadline: footer.replace(/^Deadline:\s*/i, "").trim()
            };
        });

        return {
            page: "dashboard",
            jd_text: currentJobTitle ? `Current selected job: ${currentJobTitle}` : null,
            candidates,
            jobs,
            dashboard_stats: {
                total_candidates: totalCandidates,
                active_jobs: activeJobs,
                avg_match: avgMatch,
                shortlisted
            }
        };
    } catch (e) {
        console.error("AI dashboard context error:", e);
        return {
            page: "dashboard",
            candidates: [],
            jobs: []
        };
    }
};