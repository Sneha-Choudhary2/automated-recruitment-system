async function loadDashboardData() {

    const totalEl = document.getElementById("totalCandidates");
    const avgEl = document.getElementById("avgMatch");
    const shortEl = document.getElementById("shortlisted");
    const dropdown = document.getElementById("jobDropdown");
    const container = document.getElementById("topCandidatesList");
    const currentTitle = document.getElementById("currentJobTitle");

    if (!dropdown || !container) return;

    try {

        // 🔹 Fetch Jobs
        const jobResponse = await fetch("http://127.0.0.1:8000/jobs/");
        const jobs = await jobResponse.json();

        if (!jobs.length) {
            container.innerHTML = "<p>No jobs available.</p>";
            return;
        }

        // 🔹 Populate Dropdown
        dropdown.innerHTML = "";

        jobs.forEach(job => {
            const option = document.createElement("option");
            option.value = job.id;
            option.textContent = job.title;
            dropdown.appendChild(option);
        });

        // Default latest job
        const defaultJob = jobs[0];
        dropdown.value = defaultJob.id;
        currentTitle.textContent = defaultJob.title;

        await loadRanking(defaultJob.id);

        dropdown.addEventListener("change", async (e) => {
            const jobId = e.target.value;
            const selected = jobs.find(j => j.id == jobId);
            currentTitle.textContent = selected.title;
            await loadRanking(jobId);
        });

        await loadActiveJobs();

        // 🔹 Manage Jobs SPA Navigation
        const manageBtn = document.getElementById("manageJobsBtn");
        if (manageBtn) {
            manageBtn.addEventListener("click", () => {
                loadPage("pages/job-description.html");
            });
        }

    } catch (error) {
        console.error("Dashboard load error:", error);
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

        ranked.forEach(candidate => {
            totalScore += Number(candidate.match_score || 0);
            if (Number(candidate.match_score || 0) >= 50) shortlisted++;

            const resume = resumes.find(r => Number(r.id) === Number(candidate.resume_id));

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

    const response = await fetch("http://127.0.0.1:8000/jobs/");
    const jobs = await response.json();

    if (activeJobsEl) {
        activeJobsEl.textContent = jobs.length;
    }

    container.innerHTML = "";

    jobs.forEach(job => {

        const jobCard = document.createElement("div");
        jobCard.className = "job-card";

        jobCard.innerHTML = `
            <div class="job-header">
                <div class="job-title">${job.title}</div>
                <div class="job-id">#${job.id}</div>
            </div>

            <div class="job-desc">
                ${job.raw_text.substring(0, 120)}...
            </div>

            <div class="job-footer">
                Deadline: ${job.application_deadline ? job.application_deadline.split("T")[0] : "Not set"}
            </div>
        `;

        container.appendChild(jobCard);
    });
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