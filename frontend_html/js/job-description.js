// ======================================
// JOB DESCRIPTION PAGE CONTROLLER
// ======================================

async function loadJobDescriptionPage() {
    const API = (window.API_BASE || window.API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

    const form = document.getElementById("jobForm");
    const list = document.getElementById("savedJobsList");
    const count = document.getElementById("jobCount");
    const saveBtn = document.getElementById("saveJobBtn");
    const titleInput = document.getElementById("jobTitle");
    const rawTextInput = document.getElementById("jobRawText");
    const deadlineInput = document.getElementById("jobDeadline");
    const editBanner = document.getElementById("editModeBanner");
    const cancelEditBtn = document.getElementById("cancelEditBtn");

    if (!form || !list || !count || !saveBtn) return;

    if (window.__jobDescriptionPageBound) {
        await fetchSavedJobs();
        return;
    }
    window.__jobDescriptionPageBound = true;

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });

    titleInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
        }
    });

    rawTextInput.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
        }
    });

    deadlineInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
        }
    });

    function resetFormState() {
        form.reset();
        delete form.dataset.editing;

        saveBtn.textContent = "Save Job Description";
        saveBtn.style.background = "linear-gradient(90deg,#2563eb,#7c3aed)";

        if (editBanner) {
            editBanner.style.display = "none";
        }
    }

    function setEditMode(job) {
        titleInput.value = job.title || "";
        rawTextInput.value = job.raw_text || "";
        deadlineInput.value = job.application_deadline
            ? String(job.application_deadline).split("T")[0]
            : "";

        form.dataset.editing = String(job.id);

        saveBtn.textContent = "Update Job";
        saveBtn.style.background = "linear-gradient(90deg,#16a34a,#059669)";

        if (editBanner) {
            editBanner.style.display = "flex";
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function saveJob() {
        const title = titleInput.value.trim();
        const raw_text = rawTextInput.value.trim();
        const application_deadline = deadlineInput.value || null;

        if (!title) {
            alert("Please enter a job title.");
            titleInput.focus();
            return;
        }

        if (!raw_text) {
            alert("Please enter a job description.");
            rawTextInput.focus();
            return;
        }

        const payload = {
            title,
            raw_text,
            application_deadline
        };

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = form.dataset.editing ? "Updating..." : "Saving...";

            let response;

            if (form.dataset.editing) {
                const jobId = form.dataset.editing;

                response = await fetch(`${API}/jobs/${jobId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            } else {
                response = await fetch(`${API}/jobs/create`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            }

            if (!response.ok) {
                let message = `Failed to save job. Status ${response.status}`;
                try {
                    const err = await response.json();
                    message = err.detail || JSON.stringify(err);
                } catch (_) {}
                throw new Error(message);
            }

            resetFormState();
            await fetchSavedJobs();
        } catch (error) {
            console.error("Job save failed:", error);
            alert(`Job save failed: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            if (form.dataset.editing) {
                saveBtn.textContent = "Update Job";
                saveBtn.style.background = "linear-gradient(90deg,#16a34a,#059669)";
            } else {
                saveBtn.textContent = "Save Job Description";
                saveBtn.style.background = "linear-gradient(90deg,#2563eb,#7c3aed)";
            }
        }
    }

    saveBtn.addEventListener("click", async function (e) {
        e.preventDefault();
        e.stopPropagation();
        await saveJob();
    });

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            resetFormState();
        });
    }

    list.addEventListener("click", async function (e) {
        const editBtn = e.target.closest(".edit-btn");
        const deleteBtn = e.target.closest(".delete-btn");
        const card = e.target.closest(".saved-job-card");

        if (editBtn) {
            e.preventDefault();
            e.stopPropagation();

            const jobId = editBtn.dataset.id;
            const job = await fetchSingleJob(jobId);
            if (!job) return;

            setEditMode(job);
            return;
        }

        if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();

            const jobId = deleteBtn.dataset.id;
            const ok = confirm("Are you sure you want to delete this job?");
            if (!ok) return;

            try {
                const response = await fetch(`${API}/jobs/${jobId}`, {
                    method: "DELETE"
                });

                if (!response.ok) {
                    let message = `Failed to delete job. Status ${response.status}`;
                    try {
                        const err = await response.json();
                        message = err.detail || JSON.stringify(err);
                    } catch (_) {}
                    throw new Error(message);
                }

                if (form.dataset.editing === String(jobId)) {
                    resetFormState();
                }

                await fetchSavedJobs();
            } catch (error) {
                console.error("Delete failed:", error);
                alert(`Delete failed: ${error.message}`);
            }
            return;
        }

        if (card) {
            const jobId = card.dataset.id;
            if (!jobId) return;

            const job = await fetchSingleJob(jobId);
            if (!job) return;

            setEditMode(job);
        }
    });

    await fetchSavedJobs();

    async function fetchSingleJob(jobId) {
        try {
            const response = await fetch(`${API}/jobs/`);
            if (!response.ok) {
                throw new Error(`Failed to fetch jobs. Status ${response.status}`);
            }

            const jobs = await response.json();
            return jobs.find((j) => String(j.id) === String(jobId)) || null;
        } catch (error) {
            console.error("Fetch single job failed:", error);
            alert("Could not load selected job.");
            return null;
        }
    }

    async function fetchSavedJobs() {
        try {
            const response = await fetch(`${API}/jobs/`);
            if (!response.ok) {
                throw new Error(`Failed to fetch jobs. Status ${response.status}`);
            }

            const jobs = await response.json();

            count.textContent = `${jobs.length} job(s) created`;
            list.innerHTML = "";

            if (!Array.isArray(jobs) || jobs.length === 0) {
                list.innerHTML = `<div class="saved-job-empty">No saved jobs yet.</div>`;
                return;
            }

            jobs.forEach((job) => {
                const item = document.createElement("div");
                item.className = "saved-job-card";
                item.dataset.id = job.id;
                item.dataset.title = job.title || "";
                item.dataset.rawText = job.raw_text || "";
                item.dataset.deadline = job.application_deadline || "";

                item.innerHTML = `
                    <div class="saved-job-header">
                        <div class="saved-job-title">${escapeHtml(job.title || "Untitled Job")}</div>
                        <span class="job-badge">Active</span>
                    </div>

                    <div class="saved-job-meta">
                        <span>ID: ${escapeHtml(String(job.id))}</span>
                        <span>${job.application_deadline ? formatDate(job.application_deadline) : "No deadline"}</span>
                    </div>

                    <div class="saved-job-preview">
                        ${escapeHtml((job.raw_text || "").slice(0, 160))}${(job.raw_text || "").length > 160 ? "..." : ""}
                    </div>

                    <div class="saved-job-actions">
                        <button type="button" class="edit-btn" data-id="${job.id}">Edit</button>
                        <button type="button" class="delete-btn" data-id="${job.id}">Delete</button>
                    </div>
                `;

                list.appendChild(item);
            });
        } catch (error) {
            console.error("Failed to load jobs:", error);
            count.textContent = "0 job(s) created";
            list.innerHTML = "<p>Failed to load jobs.</p>";
        }
    }
}

// ======================================
// UTILITIES
// ======================================

function formatDate(value) {
    try {
        return new Date(value).toLocaleDateString();
    } catch (_) {
        return value || "No deadline";
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ======================================
// AI CHAT CONTEXT FOR JOB PAGE
// ======================================

window.getAIChatContext = function () {
    try {
        const cards = document.querySelectorAll(".saved-job-card");
        const jobs = [];

        cards.forEach((card) => {
            const title = card.dataset.title || card.querySelector(".saved-job-title")?.textContent?.trim() || "";
            const rawText = card.dataset.rawText || "";
            const deadline = card.dataset.deadline || "";

            jobs.push({
                title,
                raw_text: rawText,
                application_deadline: deadline
            });
        });

        const activeEditTitle = document.getElementById("jobTitle")?.value?.trim() || "";
        const activeEditRawText = document.getElementById("jobRawText")?.value?.trim() || "";

        return {
            page: "job-description",
            jobs,
            jd_text: activeEditRawText || null,
            current_job_title: activeEditTitle || null
        };
    } catch (e) {
        console.error("AI jobs context error:", e);
        return {
            page: "job-description",
            jobs: []
        };
    }
};