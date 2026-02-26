// ===============================
// LOAD CANDIDATES PAGE
// ===============================

async function loadCandidates() {
    await loadJobsDropdown();
    await loadInitialResumes();
}


// ===============================
// LOAD JOBS INTO DROPDOWN
// ===============================

async function loadJobsDropdown() {

    const select = document.getElementById("job-select");
    if (!select) return;

    try {
        const res = await fetch("http://127.0.0.1:8000/jobs/");
        const jobs = await res.json();

        select.innerHTML = `<option value="">Select Job</option>`;

        jobs.forEach(job => {
            const option = document.createElement("option");
            option.value = job.id;
            option.textContent = job.title;
            select.appendChild(option);
        });

        select.addEventListener("change", async function () {
            const jobId = this.value;

            if (!jobId) {
                await loadInitialResumes();
                return;
            }

            await rankResumes(jobId);
        });

    } catch (error) {
        console.error("Failed to load jobs:", error);
    }
}


// ===============================
// DEFAULT RESUME LOAD
// ===============================

async function loadInitialResumes() {

    const res = await fetch("http://127.0.0.1:8000/resumes/");
    const data = await res.json();

    renderTable(
        data.map((r, index) => ({
            rank: index + 1,
            resume_id: r.id,
            filename: r.filename,
            match_score: 0
        }))
    );
}


// ===============================
// RANKING API
// ===============================

async function rankResumes(jobId) {

    const res = await fetch("http://127.0.0.1:8000/ats/rank-resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            job_id: parseInt(jobId),
            top_n: 10
        })
    });

    const ranked = await res.json();
    renderTable(ranked);
}


// ===============================
// RENDER TABLE (Exact Lovable Layout)
// ===============================

function renderTable(data) {

    const tableContainer = document.getElementById("candidates-table");

    if (!data || data.length === 0) {
        tableContainer.innerHTML = `
            <div class="empty-state">
                No resumes available.
            </div>
        `;
        return;
    }

    tableContainer.innerHTML = `
        <table class="rank-table">
            <thead>
                <tr>
                    <th></th>
                    <th>Rank</th>
                    <th>Candidate</th>
                    <th>Skills</th>
                    <th>Experience</th>
                    <th>Skill Match</th>
                    <th>Overall Score</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(item => {

                    const score = item.match_score || 0;

                    let badgeClass = "";
                    let badgeText = "";

                    if (score >= 85) {
                        badgeClass = "badge-excellent";
                        badgeText = "Excellent";
                    } else if (score >= 60) {
                        badgeClass = "badge-good";
                        badgeText = "Good";
                    } else {
                        badgeClass = "badge-fair";
                        badgeText = "Fair";
                    }

                    return `
                        <tr>
                            <td>
                                <input type="radio" name="candidate-select">
                            </td>

                            <td>
                                <div class="rank-circle">${item.rank}</div>
                            </td>

                            <td>
                                <div class="candidate-name">${item.filename}</div>
                                <div class="candidate-email">Uploaded Resume</div>
                            </td>

                            <td>
                                <div class="skills-row">
                                    <span class="skill-pill">Python</span>
                                    <span class="skill-pill">ML</span>
                                    <span class="skill-pill more">+2</span>
                                </div>
                            </td>

                            <td>--</td>

                            <td>
                                <div class="progress-container">
                                    <div class="progress-track">
                                        <div class="progress-fill" style="width:${score}%"></div>
                                    </div>
                                    <span class="progress-value">${score}%</span>
                                </div>
                            </td>

                            <td>
                                <div class="overall-container">
                                    <span class="overall-score">${score}%</span>
                                    <span class="score-badge ${badgeClass}">
                                        ${badgeText}
                                    </span>
                                </div>
                            </td>

                            <td class="action-icons">
                                <i data-lucide="file-text"
                                   onclick="openResumeDetail(${item.resume_id})"></i>
                                <i data-lucide="eye"
                                   onclick="openSkillAnalysis(${item.resume_id}, ${score})"></i>
                            </td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;

    if (window.lucide) {
        lucide.createIcons();
    }
}


// ===============================
// SKILL MODAL
// ===============================

function openSkillAnalysis(resumeId, score) {

    const modal = document.createElement("div");
    modal.className = "analysis-modal";

    modal.innerHTML = `
        <div class="analysis-card">
            <div class="modal-header">
                <h2>Skill Match Analysis</h2>
                <span class="close-btn"
                      onclick="this.closest('.analysis-modal').remove()">×</span>
            </div>

            <div class="analysis-body">
                <div class="analysis-score">${score}%</div>

                <div class="progress-track">
                    <div class="progress-fill" style="width:${score}%"></div>
                </div>

                <p>Matched skills calculated from job description comparison.</p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}