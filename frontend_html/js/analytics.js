document.addEventListener("DOMContentLoaded", async () => {
    loadAnalytics();
});

async function loadAnalytics() {

    try {

        const data = await apiGet("/api/analytics");

        // ===== Stats =====
        document.getElementById("totalCandidates").textContent = data.total_candidates;
        document.getElementById("avgScore").textContent = data.average_score + "%";
        document.getElementById("activeJobs").textContent = data.active_jobs;

        // ===== Score Distribution Chart =====
        new Chart(document.getElementById("scoreChart"), {
            type: "bar",
            data: {
                labels: data.score_distribution.labels,
                datasets: [{
                    label: "Candidates",
                    data: data.score_distribution.values,
                    backgroundColor: "#6366f1"
                }]
            },
            options: { responsive: true }
        });

        // ===== Experience Distribution Chart =====
        new Chart(document.getElementById("experienceChart"), {
            type: "pie",
            data: {
                labels: data.experience_distribution.labels,
                datasets: [{
                    data: data.experience_distribution.values,
                    backgroundColor: [
                        "#6366f1",
                        "#22c55e",
                        "#f59e0b",
                        "#ef4444"
                    ]
                }]
            },
            options: { responsive: true }
        });

        // ===== Top Skills Chart =====
        new Chart(document.getElementById("skillsChart"), {
            type: "bar",
            data: {
                labels: data.top_skills.labels,
                datasets: [{
                    label: "Frequency",
                    data: data.top_skills.values,
                    backgroundColor: "#22c55e"
                }]
            },
            options: { responsive: true }
        });

    } catch (error) {
        console.error("Error loading analytics:", error);
    }
}
