let selectedFiles = [];

const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const loader = document.getElementById("loader");
const toast = document.getElementById("toast");

fileInput.addEventListener("change", handleFiles);

dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("dragover");
});

dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("dragover");
});

dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("dragover");
    selectedFiles = Array.from(e.dataTransfer.files);
    renderFileList();
});

function handleFiles(event) {
    selectedFiles = Array.from(event.target.files);
    renderFileList();
}

function renderFileList() {
    fileList.innerHTML = "";
    selectedFiles.forEach(file => {
        fileList.innerHTML += `<div class="file-item">${file.name}</div>`;
    });
}

async function uploadFiles() {

    if (selectedFiles.length === 0) {
        showToast("Please select at least one file.", "error");
        return;
    }

    loader.classList.remove("hidden");

    const formData = new FormData();
    selectedFiles.forEach(file => {
        formData.append("files", file);
    });

    try {
        const response = await fetch("http://127.0.0.1:8000/api/upload-resume", {
            method: "POST",
            body: formData
        });

        if (!response.ok) throw new Error("Upload failed");

        const result = await response.json();

        showToast("Resume processed successfully!", "success");

        selectedFiles = [];
        fileList.innerHTML = "";

    } catch (error) {
        console.error(error);
        showToast("Upload failed. Check backend.", "error");
    }

    loader.classList.add("hidden");
}

function showToast(message, type) {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.add("hidden");
    }, 3000);
}
