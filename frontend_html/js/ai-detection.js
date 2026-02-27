document.addEventListener("DOMContentLoaded", async () => {
    loadCandidates();
});

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

async function runDetection() {

    const candidateId = document.getElementById("candidateSelect").value;
    const resumeText = document.getElementById("resumeText").value;

    if (!candidateId && !resumeText.trim()) {
        alert("Select candidate or paste text.");
        return;
    }

    try {

        const response = await apiPost("/api/ai-detect", {
            candidate_id: candidateId || null,
            text: resumeText || null
        });

        displayResult(response);

    } catch (error) {
        console.error("Detection error:", error);
    }
}

function displayResult(data) {

    const resultCard = document.getElementById("resultCard");
    resultCard.classList.remove("hidden");

    const score = data.ai_probability;
    const confidence = data.confidence;

    document.getElementById("aiScore").textContent = score + "% AI Probability";

    const badge = document.getElementById("riskBadge");

    if (score < 40) {
        badge.className = "risk-badge risk-low";
        badge.textContent = "Likely Human Written";
    } else if (score < 70) {
        badge.className = "risk-badge risk-medium";
        badge.textContent = "Moderate AI Indicators";
    } else {
        badge.className = "risk-badge risk-high";
        badge.textContent = "High AI Probability";
    }

    document.getElementById("confidenceBar").style.width = confidence + "%";
    document.getElementById("confidenceText").textContent =
        "Model Confidence: " + confidence + "%";

    document.getElementById("explanation").textContent =
        data.explanation || "No additional explanation provided.";
}
