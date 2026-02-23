const API_BASE = "http://127.0.0.1:8000";  // your FastAPI port

async function apiGet(endpoint) {
    const response = await fetch(API_BASE + endpoint);
    return await response.json();
}

async function apiPost(endpoint, data) {
    const response = await fetch(API_BASE + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return await response.json();
}
