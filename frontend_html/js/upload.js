function loadUploadPage() {
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("resumeFile");
    const browseBtn = document.querySelector(".browse-btn");
    const filePreview = document.getElementById("filePreview");
    const fileName = document.getElementById("fileName");
    const fileSize = document.getElementById("fileSize");
    const uploadBtn = document.getElementById("uploadBtn");
    const removeBtn = document.getElementById("removeFileBtn");
    const statusDiv = document.getElementById("uploadStatus");

    if (!dropZone || !fileInput || !browseBtn || !uploadBtn) return;

    let selectedFile = null;

    function resetDropZoneStyle() {
        dropZone.style.borderColor = "#d1d5db";
        dropZone.style.background = "#f9fafb";
    }

    function showStatus(message, type = "info") {
        statusDiv.textContent = message || "";
        statusDiv.style.color =
            type === "success" ? "green" :
            type === "error" ? "red" :
            "#374151";
    }

    function handleFile(file) {
        if (!file) return;

        const lowerName = file.name.toLowerCase();
        const allowed = [".pdf", ".doc", ".docx"];
        const validType = allowed.some(ext => lowerName.endsWith(ext));

        if (!validType) {
            showStatus("Please select a PDF, DOC, or DOCX file.", "error");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showStatus("File size must be less than 5MB.", "error");
            return;
        }

        selectedFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = (file.size / 1024).toFixed(2) + " KB";
        filePreview.style.display = "flex";
        uploadBtn.disabled = false;
        showStatus("");
    }

    browseBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
    };

    dropZone.onclick = (e) => {
        if (e.target.closest(".browse-btn")) return;
        fileInput.click();
    };

    fileInput.onchange = () => {
        handleFile(fileInput.files[0]);
    };

    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "#6366f1";
        dropZone.style.background = "#eef2ff";
    };

    dropZone.ondragleave = () => {
        resetDropZoneStyle();
    };

    dropZone.ondrop = (e) => {
        e.preventDefault();
        resetDropZoneStyle();
        const droppedFile = e.dataTransfer.files[0];
        handleFile(droppedFile);
    };

    if (removeBtn) {
        removeBtn.onclick = () => {
            selectedFile = null;
            fileInput.value = "";
            filePreview.style.display = "none";
            uploadBtn.disabled = true;
            showStatus("");
        };
    }

    uploadBtn.onclick = async () => {
        if (!selectedFile) {
            showStatus("Please choose a file first.", "error");
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);

        uploadBtn.textContent = "Uploading...";
        uploadBtn.disabled = true;

        try {
            const response = await fetch(apiUrl("/resumes/upload"), {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || data.message || "Upload failed");
            }

            showStatus(data.message || "Resume uploaded successfully.", "success");

            selectedFile = null;
            fileInput.value = "";
            filePreview.style.display = "none";
            uploadBtn.textContent = "Upload Resume";
            uploadBtn.disabled = true;

            await loadUploadedResumes();

            localStorage.setItem("resume_updated", Date.now().toString());
        } catch (error) {
            console.error("Upload error:", error);
            showStatus(error.message || "Upload failed", "error");
            uploadBtn.textContent = "Upload Resume";
            uploadBtn.disabled = false;
        }
    };

    loadUploadedResumes();

    if (window.lucide) {
        lucide.createIcons();
    }
}

async function loadUploadedResumes() {
    const list = document.getElementById("resumeList");
    if (!list) return;

    list.innerHTML = "<p>Loading resumes...</p>";

    try {
        const resumes = await apiGet("/resumes/");

        if (!Array.isArray(resumes) || resumes.length === 0) {
            list.innerHTML = "<p>No resumes uploaded yet.</p>";
            return;
        }

        list.innerHTML = "";

        resumes.forEach((resume, index) => {
            const item = document.createElement("div");
            item.className = "resume-list-item";

            const fileLabel = resume.filename || `Resume ${index + 1}`;
            const resumeId = resume.id ?? "-";

            item.innerHTML = `
                <div class="resume-list-left">
                    <div class="resume-list-name">${fileLabel}</div>
                    <div class="resume-list-meta">Resume ID: ${resumeId}</div>
                </div>
            `;

            list.appendChild(item);
        });
    } catch (error) {
        console.error("Error loading resumes:", error);
        list.innerHTML = "<p>Failed to load resumes.</p>";
    }
}

window.getAIChatContext = function () {
    try {
        const uploadedResumeItems = Array.from(document.querySelectorAll("#resumeList .resume-list-item"));
        const resumes = uploadedResumeItems.map((item) => {
            const name = item.querySelector(".resume-list-name")?.textContent?.trim() || "";
            const meta = item.querySelector(".resume-list-meta")?.textContent?.trim() || "";
            return {
                title: name,
                raw_text: meta
            };
        });

        return {
            page: "upload",
            jobs: [],
            candidates: [],
            upload_info: {
                supported_formats: ["PDF", "DOC", "DOCX"],
                max_file_size: "5MB",
                pipeline_steps: [
                    "Text Extraction",
                    "NLP Analysis",
                    "AI Detection",
                    "Job Matching",
                    "ML Prediction"
                ]
            },
            uploaded_resumes: resumes
        };
    } catch (e) {
        console.error("AI upload context error:", e);
        return {
            page: "upload",
            candidates: [],
            jobs: []
        };
    }
};

window.loadUploadPage = loadUploadPage;

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        if (document.getElementById("dropZone")) loadUploadPage();
    });
} else {
    if (document.getElementById("dropZone")) loadUploadPage();
}