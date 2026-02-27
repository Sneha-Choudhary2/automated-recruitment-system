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

    container.innerHTML = "Loading...";

    const response = await fetch("http://127.0.0.1:8000/ats/rank-resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            job_id: parseInt(jobId),
            top_n: 5
        })
    });

    const data = await response.json();

    let totalScore = 0;
    let shortlisted = 0;

    data.forEach(item => {
        totalScore += item.match_score;
        if (item.match_score >= 50) shortlisted++;
    });

    const avgScore = data.length
        ? (totalScore / data.length).toFixed(1)
        : 0;

    totalEl.textContent = data.length;
    avgEl.textContent = avgScore + "%";
    shortEl.textContent = shortlisted;

    container.innerHTML = "";

    data.forEach(candidate => {

        const row = document.createElement("div");
        row.className = "candidate-row";

        row.innerHTML = `
            <div class="rank-circle">#${candidate.rank}</div>
            <div class="candidate-details">
                <div class="candidate-name">${candidate.filename}</div>
                <div class="candidate-sub">Match evaluation result</div>
            </div>
            <div class="candidate-score">
                <div class="score-value">${candidate.match_score}%</div>
                <div class="score-label">Match Score</div>
            </div>
        `;

        container.appendChild(row);
    });
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