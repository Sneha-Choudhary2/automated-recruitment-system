document.addEventListener("DOMContentLoaded", async () => {
    loadJobs();
    loadCandidates();
});

async function loadJobs() {
    try {
        const jobs = await apiGet("/api/jobs");
        const select = document.getElementById("jobSelect");

        select.innerHTML = `<option value="">Select Job</option>`;

        jobs.forEach(job => {
            const option = document.createElement("option");
            option.value = job.id;
            option.textContent = job.title;
            select.appendChild(option);
        });

    } catch (error) {
        console.error("Error loading jobs:", error);
    }
}

async function loadCandidates() {
    try {
        const candidates = await apiGet("/api/candidates");
        const select = document.getElementById("candidateSelect");

        select.innerHTML = `<option value="">Select Candidate</option>`;

        candidates.forEach(c => {
            const option = document.createElement("option");
            option.value = c.id;
            option.textContent = c.name;
            select.appendChild(option);
        });

    } catch (error) {
        console.error("Error loading candidates:", error);
    }
}

async function analyzeGap() {

    const jobId = document.getElementById("jobSelect").value;
    const candidateId = document.getElementById("candidateSelect").value;

    if (!jobId || !candidateId) {
        alert("Select both job and candidate.");
        return;
    }

    try {

        const result = await apiGet(`/api/skill-gap?job_id=${jobId}&candidate_id=${candidateId}`);

        displayResult(result);

    } catch (error) {
        console.error("Skill gap error:", error);
    }
}

function displayResult(data) {

    const resultCard = document.getElementById("gapResult");
    resultCard.classList.remove("hidden");

    document.getElementById("gapPercentage").textContent =
        data.gap_percentage + "% Skill Match";

    document.getElementById("gapBar").style.width =
        data.gap_percentage + "%";

    const matchingDiv = document.getElementById("matchingSkills");
    matchingDiv.innerHTML = data.matching_skills
        .map(skill => `<span class="skill-good">${skill}</span>`)
        .join("");

    const missingDiv = document.getElementById("missingSkills");
    missingDiv.innerHTML = data.missing_skills
        .map(skill => `<span class="skill-missing">${skill}</span>`)
        .join("");

    document.getElementById("recommendation").textContent =
        data.recommendation;
}
