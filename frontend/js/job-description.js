// ======================================
// JOB DESCRIPTION PAGE CONTROLLER
// ======================================

async function loadJobDescriptionPage() {

    const form = document.getElementById("jobForm");
    const list = document.getElementById("savedJobsList");
    const count = document.getElementById("jobCount");
    const saveBtn = document.querySelector(".jd-save-btn");

    if (!form) return;

    initSkillSelector();
    await fetchSavedJobs();

    // ======================================
    // CREATE / UPDATE JOB
    // ======================================

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("jobTitle").value;
        const raw_text = document.getElementById("jobRawText").value;
        const application_deadline =
            document.getElementById("jobDeadline").value || null;

        try {

            if (form.dataset.editing) {

                const jobId = form.dataset.editing;

                await fetch(`http://127.0.0.1:8000/jobs/${jobId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title,
                        raw_text,
                        application_deadline
                    })
                });

            } else {

                await fetch("http://127.0.0.1:8000/jobs/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title,
                        raw_text,
                        application_deadline
                    })
                });
            }

            // Reset form after save
            form.reset();
            delete form.dataset.editing;

            saveBtn.textContent = "Save Job Description";
            saveBtn.style.background =
                "linear-gradient(90deg,#2563eb,#7c3aed)";

            await fetchSavedJobs();

        } catch (error) {
            console.error("Job save failed:", error);
        }
    });

    // ======================================
    // EDIT + DELETE HANDLER
    // ======================================

    document.addEventListener("click", async function (e) {

        // EDIT
        if (e.target.classList.contains("edit-btn")) {

            const jobId = e.target.dataset.id;

            const response = await fetch("http://127.0.0.1:8000/jobs/");
            const jobs = await response.json();

            const job = jobs.find(j => j.id == jobId);
            if (!job) return;

            document.getElementById("jobTitle").value = job.title;
            document.getElementById("jobRawText").value = job.raw_text;
            document.getElementById("jobDeadline").value =
                job.application_deadline
                    ? job.application_deadline.split("T")[0]
                    : "";

            form.dataset.editing = job.id;

            saveBtn.textContent = "Update Job";
            saveBtn.style.background =
                "linear-gradient(90deg,#16a34a,#059669)";

            window.scrollTo({ top: 0, behavior: "smooth" });
        }

        // DELETE
        if (e.target.classList.contains("delete-btn")) {

            const jobId = e.target.dataset.id;

            const confirmDelete = confirm(
                "Are you sure you want to delete this job?"
            );
            if (!confirmDelete) return;

            await fetch(`http://127.0.0.1:8000/jobs/${jobId}`, {
                method: "DELETE"
            });

            await fetchSavedJobs();
        }
    });

    // ======================================
    // FETCH SAVED JOBS
    // ======================================

    async function fetchSavedJobs() {

        try {
            const response = await fetch("http://127.0.0.1:8000/jobs/");
            const jobs = await response.json();

            count.textContent = jobs.length + " job(s) created";
            list.innerHTML = "";

            jobs.forEach(job => {

                const item = document.createElement("div");
                item.className = "saved-job-card";

                item.innerHTML = `
                    <div class="saved-job-header">
                        <div class="saved-job-title">${job.title}</div>
                        <span class="job-badge">Active</span>
                    </div>

                    <div class="saved-job-meta">
                        <span>ID: ${job.id}</span>
                        <span>
                            ${job.application_deadline
                                ? new Date(job.application_deadline).toLocaleDateString()
                                : "No deadline"}
                        </span>
                    </div>

                    <div class="saved-job-actions">
                        <button class="edit-btn" data-id="${job.id}">Edit</button>
                        <button class="delete-btn" data-id="${job.id}">Delete</button>
                    </div>
                `;

                list.appendChild(item);
            });

        } catch (error) {
            list.innerHTML = "<p>Failed to load jobs.</p>";
        }
    }
}


// ======================================
// SKILL SELECTOR
// ======================================

function initSkillSelector() {

    const input = document.getElementById("skillInput");
    const selectedContainer = document.getElementById("selectedSkills");
    const suggestionContainer = document.getElementById("skillSuggestions");

    if (!input || !selectedContainer || !suggestionContainer) return;

    const selectedSkills = new Set();

    function createSkillPill(skill) {

        const pill = document.createElement("div");
        pill.className = "skill-pill";
        pill.innerHTML = `
            ${skill}
            <span class="remove">×</span>
        `;

        pill.querySelector(".remove").onclick = () => {
            selectedSkills.delete(skill);
            pill.remove();
            addBackToSuggestions(skill);
        };

        selectedContainer.appendChild(pill);
    }

    function addSkill(skill) {

        skill = skill.trim();
        if (!skill || selectedSkills.has(skill)) return;

        selectedSkills.add(skill);
        removeFromSuggestions(skill);
        createSkillPill(skill);
        input.value = "";
    }

    function removeFromSuggestions(skill) {
        suggestionContainer.querySelectorAll("span").forEach(span => {
            if (span.textContent === skill) span.remove();
        });
    }

    function addBackToSuggestions(skill) {
        const span = document.createElement("span");
        span.textContent = skill;
        span.onclick = () => addSkill(skill);
        suggestionContainer.appendChild(span);
    }

    suggestionContainer.querySelectorAll("span").forEach(span => {
        span.onclick = () => addSkill(span.textContent);
    });

    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            addSkill(input.value);
        }
    });
}