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

    if (!dropZone) return;

    let selectedFile = null;

    // OPEN FILE PICKER
    browseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    dropZone.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", () => {
        handleFile(fileInput.files[0]);
    });

    // DRAG & DROP
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "#6366f1";
        dropZone.style.background = "#eef2ff";
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.style.borderColor = "#d1d5db";
        dropZone.style.background = "#f9fafb";
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "#d1d5db";
        dropZone.style.background = "#f9fafb";
        handleFile(e.dataTransfer.files[0]);
    });

    function handleFile(file) {

        if (!file) return;

        selectedFile = file;

        fileName.textContent = file.name;
        fileSize.textContent = (file.size / 1024).toFixed(2) + " KB";

        filePreview.style.display = "flex";
        uploadBtn.disabled = false;
        statusDiv.textContent = "";
    }

    removeBtn.addEventListener("click", () => {
        selectedFile = null;
        fileInput.value = "";
        filePreview.style.display = "none";
        uploadBtn.disabled = true;
        statusDiv.textContent = "";
    });

    uploadBtn.addEventListener("click", async () => {

        if (!selectedFile) return;

        const formData = new FormData();
        formData.append("file", selectedFile);

        uploadBtn.textContent = "Uploading...";
        uploadBtn.disabled = true;

        try {

            const response = await fetch(
                "http://127.0.0.1:8000/resumes/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Upload failed");
            }

            statusDiv.style.color = "green";
            statusDiv.textContent = data.message || "Upload successful";

            uploadBtn.textContent = "Upload Resume";

        } catch (error) {

            statusDiv.style.color = "red";
            statusDiv.textContent = error.message;

            uploadBtn.textContent = "Upload Resume";
            uploadBtn.disabled = false;
        }
    });
}