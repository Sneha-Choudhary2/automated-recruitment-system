document.addEventListener("DOMContentLoaded", async () => {
    bindInputSync();
    await loadCandidates();
});

function bindInputSync() {
    const candidateSelect = document.getElementById("candidateSelect");
    const resumeText = document.getElementById("resumeText");

    if (candidateSelect) {
        candidateSelect.addEventListener("change", () => {
            if (candidateSelect.value) {
                resumeText.value = "";
            }
        });
    }

    if (resumeText) {
        resumeText.addEventListener("input", () => {
            if (resumeText.value.trim()) {
                candidateSelect.value = "";
            }
        });
    }
}

async function loadCandidates() {
    try {
        const candidates = await apiGet("/api/candidates");
        const select = document.getElementById("candidateSelect");

        if (!select) return;

        select.innerHTML = `<option value="">Choose a candidate...</option>`;

        candidates.forEach((c) => {
            const option = document.createElement("option");
            option.value = c.id;
            option.textContent = c.name || `Candidate ${c.id}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading candidates:", error);
    }
}

async function runDetection() {
    const candidateId = document.getElementById("candidateSelect")?.value || "";
    const resumeText = document.getElementById("resumeText")?.value || "";
    const analyzeBtn = document.querySelector("button[onclick='runDetection()']");

    if (!candidateId && !resumeText.trim()) {
        alert("Select a candidate or paste resume text.");
        return;
    }

    try {
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = "Analyzing...";
        }

        showLoadingState();

        const response = await apiPost("/api/ai-detect", {
            candidate_id: candidateId || null,
            text: resumeText.trim() || null
        });

        displayResult(response);
    } catch (error) {
        console.error("Detection error:", error);
        showErrorState("Failed to analyze content. Please try again.");
    } finally {
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = "Analyze for AI Content";
        }
    }
}

function showLoadingState() {
    const emptyState = document.getElementById("emptyState");
    const resultContent = document.getElementById("resultContent");

    if (emptyState) {
        emptyState.style.display = "block";
        emptyState.innerHTML = `<p style="margin-top:40px;">Analyzing resume content...</p>`;
    }

    if (resultContent) {
        resultContent.style.display = "none";
    }
}

function showErrorState(message) {
    const emptyState = document.getElementById("emptyState");
    const resultContent = document.getElementById("resultContent");

    if (resultContent) {
        resultContent.style.display = "none";
    }

    if (emptyState) {
        emptyState.style.display = "block";
        emptyState.innerHTML = `<p style="margin-top:40px; color:#c0392b;">${message}</p>`;
    }
}

function displayResult(data) {
    const emptyState = document.getElementById("emptyState");
    const resultContent = document.getElementById("resultContent");

    if (emptyState) {
        emptyState.style.display = "none";
    }

    if (resultContent) {
        resultContent.style.display = "block";
    }

    const score = Number(data.ai_probability ?? 0);
    const confidence = Number(data.confidence ?? 0);

    const aiScore = document.getElementById("aiScore");
    const badge = document.getElementById("riskBadge");
    const confidenceBar = document.getElementById("confidenceBar");
    const confidenceText = document.getElementById("confidenceText");
    const explanation = document.getElementById("explanation");

    if (aiScore) {
        aiScore.textContent = `${score}% AI Probability`;
    }

    if (badge) {
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
    }

    if (confidenceBar) {
        confidenceBar.style.width = `${confidence}%`;
    }

    if (confidenceText) {
        confidenceText.textContent = `Model Confidence: ${confidence}%`;
    }

    if (explanation) {
        explanation.textContent =
            data.explanation || "No additional explanation provided.";
    }
}