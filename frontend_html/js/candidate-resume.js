// js/candidate-resume.js (UPDATED)
// - Uses API_BASE from api.js
// - Stops guessing broken endpoints first; uses /resumes/ list + common detail patterns
// - Removes missing skills UI entirely
// - Adds Delete resume button (best-effort endpoints)
// - Keeps all existing IDs and UI structure intact

function extractSection(text, titles) {
  const t = String(text || "");
  if (!t.trim()) return "";
  const lines = t.split(/\r?\n/);
  const up = lines.map((l) => l.trim());

  const idx = up.findIndex((l) =>
    titles.some((h) => l.toLowerCase() === h.toLowerCase() || l.toLowerCase().startsWith(h.toLowerCase()))
  );
  if (idx < 0) return "";

  const out = [];
  for (let i = idx + 1; i < up.length; i++) {
    const line = up[i];
    if (!line) continue;

    const isHeading =
      /^[A-Z][A-Z \-\/&]{3,}$/.test(line) ||
      [
        "education",
        "work experience",
        "experience",
        "skills",
        "projects",
        "certifications",
        "summary",
        "contact",
        "technical skills",
      ].some((h) => line.toLowerCase() === h);

    if (isHeading) break;
    out.push(lines[i]);
    if (out.join("\n").length > 1800) break;
  }
  return out.join("\n").trim();
}

function guessEmailPhone(text) {
  const t = String(text || "");
  const email = (t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || null;
  const phone = (t.match(/(\+?\d[\d\s().-]{8,}\d)/) || [])[0] || null;
  return { email, phone };
}

function guessYears(text) {
  const t = String(text || "");
  const m =
    t.match(/(\d{1,2})\+?\s*(years|yrs)\s+of\s+experience/i) ||
    t.match(/(\d{1,2})\+?\s*(years|yrs)\s+experience/i);
  if (!m) return null;
  return m[1];
}

function normalizeSkillArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string") {
    return v
      .split(/[,\n|]/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadCandidateResumePage() {
  const API = (window.API_BASE || "http://127.0.0.1:8000").replace(/\/$/, "");

  const params = new URLSearchParams(window.location.search);
  const resumeId = params.get("resume_id") || params.get("id");
  if (!resumeId) return;

  const $ = (id) => document.getElementById(id);
  const safe = (v, d = "--") => (v === undefined || v === null || v === "" ? d : v);

  async function fetchFirstJson(urls) {
    for (const url of urls) {
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        const data = await r.json();
        if (data) return data;
      } catch (_) {}
    }
    return null;
  }

  // 1) Always try to locate from /resumes/ list first (this exists and is stable in your backend)
  let details = null;
  try {
    const list = await (window.apiGet ? window.apiGet("/resumes/") : fetch(API + "/resumes/").then((r) => r.json()));
    if (Array.isArray(list)) {
      details =
        list.find((x) => String(x.id) === String(resumeId)) ||
        list.find((x) => String(x.resume_id) === String(resumeId)) ||
        null;
    }
  } catch (_) {}

  // 2) If list item is lightweight, try common detail routes (best effort)
  if (!details || (!details.resume_text && !details.text && !details.content)) {
    const tries = [
      `${API}/resumes/${encodeURIComponent(resumeId)}`,
      `${API}/ats/resumes/${encodeURIComponent(resumeId)}`,
      `${API}/resume/${encodeURIComponent(resumeId)}`,
    ];
    const found = await fetchFirstJson(tries);
    if (found) details = found;
  }

  if (!details) return;

  const name =
    details.name ||
    details.candidate_name ||
    details.filename ||
    details.file_name ||
    details.original_filename ||
    `Resume #${resumeId}`;

  const resumeText = details.resume_text || details.resumeText || details.text || details.raw_text || details.content || "";

  const guessed = guessEmailPhone(resumeText);
  const email = safe(details.email || guessed.email);
  const phone = safe(details.phone || guessed.phone);

  const uploadedAt = details.uploadedAt || details.uploaded_at || details.created_at || details.createdAt || null;

  const education = safe(
    details.education ||
      details.educationLevel ||
      details.education_level ||
      details.highest_education ||
      extractSection(resumeText, ["EDUCATION"]),
    "--"
  );

  const certsArr = details.certifications || details.certs || details.certificates || [];
  const certs = Array.isArray(certsArr) ? certsArr : normalizeSkillArray(certsArr);

  const matched = normalizeSkillArray(details.matched_skills || details.matchedSkills || details.skills_matched || []);
  const extra = normalizeSkillArray(details.extra_skills || details.extraSkills || details.additional_skills || []);

  const overallRaw =
    details.match_score ??
    details.overallScore ??
    details.overall_score ??
    details.similarity ??
    details.similarity_score ??
    details.match ??
    details.score ??
    null;

  const skillRaw =
    details.skill_match_score ??
    details.skillMatchPercentage ??
    details.skill_match ??
    details.skill_score ??
    details.skill_match_pct ??
    details.skillMatch ??
    null;

  const overall = overallRaw === null ? null : Number(overallRaw);
  const skill = skillRaw === null ? null : Number(skillRaw);

  const guessedYears = guessYears(resumeText);
  const years = safe(details.yearsOfExperience ?? details.years_experience ?? details.experience_years ?? guessedYears ?? "--");

  // Shortlist prob (use backend if present else compute fallback)
  let shortlist = details.shortlistProbability ?? details.shortlist_prob ?? details.shortlist_probability ?? details.probability ?? null;
  if (shortlist !== null && shortlist !== undefined && shortlist !== "") {
    shortlist = Number(shortlist);
    if (shortlist <= 1) shortlist = shortlist * 100;
  } else {
    const base = (Number.isFinite(overall) ? overall : 0) * 0.6 + (Number.isFinite(skill) ? skill : 0) * 0.4;
    shortlist = Math.max(0, Math.min(100, Math.round(base)));
  }

  // Fill metrics
  $("r-name").textContent = safe(name, `Resume #${resumeId}`);
  $("r-overall").textContent = Number.isFinite(overall) ? `${Math.round(overall)}%` : "--";
  $("r-skill").textContent = Number.isFinite(skill) ? `${Math.round(skill)}%` : "--";
  $("r-exp").textContent = years;
  $("r-short").textContent = `${Math.round(shortlist)}%`;

  // Contact
  $("r-contact").innerHTML = `
    <div class="contact-row"><i data-lucide="mail"></i> <span>${escapeHtml(String(email))}</span></div>
    <div class="contact-row"><i data-lucide="phone"></i> <span>${escapeHtml(String(phone))}</span></div>
    <div class="contact-row"><i data-lucide="calendar"></i>
      <span>Uploaded ${uploadedAt ? new Date(uploadedAt).toLocaleDateString() : "--"}</span>
    </div>
  `;

  // Left blocks
  $("r-edu").textContent = safe(education);

  $("r-certs").innerHTML =
    Array.isArray(certs) && certs.length
      ? certs.map((c) => `<span class="pill">${escapeHtml(String(c))}</span>`).join(" ")
      : "—";

  $("r-skills").innerHTML = `
    <div class="skill-block">
      <div class="skill-title green">Matched Skills</div>
      <div class="pill-wrap">
        ${(Array.isArray(matched) && matched.length ? matched : ["--"])
          .map((s) => `<span class="pill pill-green">${escapeHtml(String(s))}</span>`)
          .join("")}
      </div>
    </div>

    <div class="skill-block">
      <div class="skill-title blue">Additional Skills</div>
      <div class="pill-wrap">
        ${(Array.isArray(extra) && extra.length ? extra : ["--"])
          .map((s) => `<span class="pill">${escapeHtml(String(s))}</span>`)
          .join("")}
      </div>
    </div>
  `;

  // Work + Full text
  const expSection = safe(
    details.work_experience || details.experience || details.workExperience || extractSection(resumeText, ["WORK EXPERIENCE", "EXPERIENCE"]),
    ""
  );

  const workEl = $("r-work");
  if (workEl) workEl.textContent = expSection ? expSection : "No detailed work experience available.";

  $("r-text").textContent = resumeText ? resumeText : "Resume text not available from API.";

  // Analysis block
  const skillPct = Number.isFinite(skill) ? Math.max(0, Math.min(100, skill)) : 0;

  $("r-analysis").innerHTML = `
    <div class="analysis-line">
      <div>Overall Skill Match</div>
      <div class="analysis-val">${Number.isFinite(skill) ? `${Math.round(skill)}%` : "--"}</div>
    </div>
    <div class="analysis-bar"><div class="analysis-fill" style="width:${skillPct}%"></div></div>

    <div class="analysis-cards">
      <div class="mini greenish">
        <div class="mini-num">${Array.isArray(matched) ? matched.length : 0}</div>
        <div class="mini-label">Matched Skills</div>
      </div>
      <div class="mini bluish">
        <div class="mini-num">${Array.isArray(extra) ? extra.length : 0}</div>
        <div class="mini-label">Extra Skills</div>
      </div>
      <div class="mini reddish">
        <div class="mini-num">${escapeHtml(String(years))}</div>
        <div class="mini-label">Years</div>
      </div>
    </div>
  `;

  // Download
  const fileUrl = details.file_url || details.resume_url || details.url || details.download_url || details.file || null;
  const downloadBtn = $("downloadBtn");
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      if (!fileUrl) return alert("Download URL not available from API");
      const abs = String(fileUrl).startsWith("http") ? String(fileUrl) : API + (String(fileUrl).startsWith("/") ? "" : "/") + String(fileUrl);
      window.open(abs, "_blank", "noopener,noreferrer");
    };
  }

  // Shortlist (uses SAME key as candidates.js)
  const shortlistBtn = $("shortlistBtn");
  if (shortlistBtn) {
    const key = "recruitai_shortlist_ids";

    const getList = () => {
      try {
        const arr = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(arr) ? arr.map(String) : [];
      } catch {
        return [];
      }
    };
    const setList = (arr) => localStorage.setItem(key, JSON.stringify(arr));

    const render = () => {
      const arr = getList();
      const on = arr.includes(String(resumeId));
      shortlistBtn.classList.toggle("active", on);
      shortlistBtn.classList.toggle("starred", on);
      shortlistBtn.innerHTML = on
        ? `<i data-lucide="star"></i> Shortlisted`
        : `<i data-lucide="star"></i> Shortlist`;
      if (window.lucide) lucide.createIcons();
    };

    shortlistBtn.onclick = () => {
      const arr = getList();
      const id = String(resumeId);
      const idx = arr.indexOf(id);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(id);
      setList(arr);
      render();
    };

    render();
  }

  // Delete resume
  const deleteBtn = $("deleteBtn");
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      const label = name ? `Delete "${name}"?` : "Delete this resume?";
      if (!confirm(label)) return;

      const endpoints = [
        { method: "DELETE", url: `${API}/resumes/${encodeURIComponent(resumeId)}` },
        { method: "POST", url: `${API}/resumes/${encodeURIComponent(resumeId)}/delete` },
        { method: "POST", url: `${API}/ats/resumes/${encodeURIComponent(resumeId)}/delete` },
      ];

      let ok = false;
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep.url, {
            method: ep.method,
            headers: ep.method === "POST" ? { "Content-Type": "application/json" } : undefined,
          });
          if (res.ok) {
            ok = true;
            break;
          }
        } catch (_) {}
      }

      if (!ok) {
        alert("Delete API endpoint not found on backend. Add DELETE /resumes/{id} (or a delete route) to enable delete.");
        return;
      }

      // remove from shortlist if present
      try {
        const raw = localStorage.getItem("recruitai_shortlist_ids");
        const arr = raw ? JSON.parse(raw) : [];
        const next = Array.isArray(arr) ? arr.map(String).filter((x) => x !== String(resumeId)) : [];
        localStorage.setItem("recruitai_shortlist_ids", JSON.stringify(next));
      } catch {}

      // go back
      window.history.back();
    };
  }

  if (window.lucide) lucide.createIcons();
}

// expose for layout.js handler map
window.loadCandidateResumePage = loadCandidateResumePage;

// standalone safety
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("r-name")) loadCandidateResumePage();
  });
} else {
  if (document.getElementById("r-name")) loadCandidateResumePage();
}