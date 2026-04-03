// candidates.js
(() => {
  const API = (window.API_BASE || window.API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

  const els = {
    jobSelect: null,
    scoreSelect: null,
    searchInput: null,
    tbody: null,
    countText: null,
    exportBtn: null,
    modal: null,
    modalName: null,
    modalEmail: null,
    modalOverall: null,
    modalSkill: null,
    modalShort: null,
    modalExp: null,
    modalEdu: null,
    modalMatched: null,
    modalExtra: null,
    modalCerts: null,
  };

  const state = {
    jobs: [],
    resumes: [],
    candidates: [],
    byId: new Map(),
    shortlist: new Set(),
    activeJobId: "",
    search: "",
    scoreFilter: "",
    pageBound: false,
    focusBound: false,
  };

  const storageKey = "recruitai_shortlist_ids";
  const detailCacheKey = "recruitai_candidate_detail_cache";

  const fetchJSON = async (url, opts) => {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return await res.json();
  };

  const setCount = (n) => {
    if (els.countText) els.countText.textContent = String(n ?? 0);
  };

  const loadShortlist = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        state.shortlist = new Set(arr.map((id) => String(id)));
      }
    } catch {
      state.shortlist = new Set();
    }
  };

  const saveShortlist = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(state.shortlist)));
    } catch {}
  };

  const scoreLabel = (n) => {
    const v = Number(n || 0);
    if (v >= 85) return { t: "Excellent", c: "excellent" };
    if (v >= 70) return { t: "Good", c: "good" };
    if (v >= 50) return { t: "Fair", c: "fair" };
    return { t: "Poor", c: "poor" };
  };

  const normalizeSkills = (x) => {
    if (!x) return [];
    if (Array.isArray(x)) return x.map(String).map((s) => s.trim()).filter(Boolean);
    if (typeof x === "string") {
      return x
        .split(/[,|\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  const getResumeText = (resume) =>
    resume?.extracted_text ||
    resume?.resume_text ||
    resume?.text ||
    resume?.content ||
    resume?.parsed_text ||
    "";

  const guessYears = (text) => {
    if (!text) return null;
    const t = String(text);
    const m1 = t.match(/(\d+)\s*\+?\s*(?:years|yrs)\b/i);
    if (m1) return Number(m1[1]);
    const m2 = t.match(/\b(\d+(?:\.\d+)?)\s*(?:years|yrs)\s+of\s+experience\b/i);
    if (m2) return Math.round(Number(m2[1]));
    return null;
  };

  const extractFromResumeText = (text) => {
    const t = String(text || "");
    const email = (t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || "";
    const edu =
      (
        t.match(
          /\b(Master'?s|Bachelor'?s|B\.?Tech|M\.?Tech|B\.?E|M\.?E|B\.?Sc|M\.?Sc|MBA|Ph\.?D)\b[^\n]{0,40}/i
        ) || []
      )[0] || "";
    const years = guessYears(t);
    return { email, edu, years };
  };

  const escapeHtml = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const chipHtml = (txt, kind) => {
    const cls =
      kind === "green"
        ? "chip chip-green"
        : kind === "blue"
          ? "chip chip-blue"
          : "chip chip-gray";
    return `<span class="${cls}">${escapeHtml(txt)}</span>`;
  };

  const getRanked = async (jobId) => {
    const res = await fetch(API + "/ats/rank-resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: Number(jobId) }),
    });
    if (!res.ok) throw new Error("rank failed");
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.ranked_resumes)) return data.ranked_resumes;
    if (Array.isArray(data.results)) return data.results;
    return [];
  };

  const loadJobs = async () => {
    const jobs = await fetchJSON(API + "/jobs/");
    state.jobs = Array.isArray(jobs) ? jobs : [];

    if (!els.jobSelect) return;

    els.jobSelect.innerHTML =
      `<option value="">All Jobs</option>` +
      state.jobs
        .map((j) => `<option value="${j.id}">${escapeHtml(j.title || "Job " + j.id)}</option>`)
        .join("");

    els.jobSelect.value = state.activeJobId || "";
  };

  const loadResumes = async () => {
    const resumes = await fetchJSON(API + "/resumes/");
    state.resumes = Array.isArray(resumes) ? resumes : [];
  };

  const buildCandidatesFromRanked = (ranked) => {
    const out = [];
    const items = Array.isArray(ranked) ? ranked : [];

    for (let i = 0; i < items.length; i++) {
      const r = items[i] || {};
      const resumeId = r.resume_id ?? r.id ?? r.resumeId;
      const resume = state.resumes.find((x) => String(x.id) === String(resumeId)) || null;

      const name =
        r.name ||
        resume?.name ||
        resume?.candidate_name ||
        resume?.filename ||
        resume?.file_name ||
        r.filename ||
        `Candidate ${resumeId ?? i + 1}`;

      const resumeText = getResumeText(resume);
      const parsed = extractFromResumeText(resumeText);

      const matched = normalizeSkills(
        r.matched_skills || r.matchedSkills || r.skills_matched || resume?.skills || []
      );
      const extra = normalizeSkills(
        r.extra_skills || r.extraSkills || r.additional_skills || []
      );

      const overall = Number(r.match_score ?? r.overall_score ?? r.score ?? 0);
      const skillMatch = Number(r.similarity_score ?? r.skill_match ?? 0);
      const expYears =
        resume?.years_of_experience ||
        resume?.experience_years ||
        parsed.years ||
        null;

      out.push({
        id: String(resumeId ?? i + 1),
        rank: r.rank ?? i + 1,
        name: String(name || "—"),
        email: String(r.email || resume?.email || parsed.email || "—"),
        education: String(r.education || resume?.education || parsed.edu || "—"),
        experience: expYears ? `${expYears} years` : "—",
        matched_skills: matched,
        extra_skills: extra,
        certifications: normalizeSkills(r.certifications || resume?.certifications || []),
        skill_match: Number.isFinite(skillMatch) ? skillMatch : 0,
        overall_score: Number.isFinite(overall) ? overall : 0,
        source: "ranked",

        filename: resume?.filename || r.filename || name,
        extracted_text: resume?.extracted_text || "",
        uploaded_at: resume?.uploaded_at || null,
        file_path: resume?.file_path || null,
      });
    }

    return out;
  };

  const buildCandidatesFromAllResumes = () => {
    const out = [];

    for (let i = 0; i < state.resumes.length; i++) {
      const resume = state.resumes[i] || {};
      const resumeText = getResumeText(resume);
      const parsed = extractFromResumeText(resumeText);

      const name =
        resume?.name ||
        resume?.candidate_name ||
        resume?.filename ||
        resume?.file_name ||
        `Candidate ${resume?.id ?? i + 1}`;

      const matched = normalizeSkills(
        resume?.skills ||
        resume?.matched_skills ||
        resume?.parsed_skills ||
        []
      );

      const expYears =
        resume?.years_of_experience ||
        resume?.experience_years ||
        parsed.years ||
        null;

      out.push({
        id: String(resume?.id ?? i + 1),
        rank: i + 1,
        name: String(name || "—"),
        email: String(resume?.email || parsed.email || "—"),
        education: String(resume?.education || parsed.edu || "—"),
        experience: expYears ? `${expYears} years` : "—",
        matched_skills: matched,
        extra_skills: [],
        certifications: normalizeSkills(resume?.certifications || []),
        skill_match: 0,
        overall_score: 0,
        source: "all",

        filename: resume?.filename || name,
        extracted_text: resume?.extracted_text || "",
        uploaded_at: resume?.uploaded_at || null,
        file_path: resume?.file_path || null,
      });
    }

    return out;
  };

  const applyFilters = (list) => {
    const q = (state.search || "").trim().toLowerCase();
    const score = state.scoreFilter || "";

    return (list || []).filter((c) => {
      if (q) {
        const hay = [
          c.name,
          c.email,
          c.education,
          c.experience,
          ...(c.matched_skills || []),
          ...(c.extra_skills || []),
        ]
          .join(" ")
          .toLowerCase();

        if (!hay.includes(q)) return false;
      }

      if (score && c.source === "ranked") {
        const s = scoreLabel(c.overall_score).c;
        if (s !== score) return false;
      }

      return true;
    });
  };

  const cacheCandidateDetails = (candidate) => {
    try {
      const raw = localStorage.getItem(detailCacheKey);
      const map = raw ? JSON.parse(raw) : {};
      map[String(candidate.id)] = candidate;
      localStorage.setItem(detailCacheKey, JSON.stringify(map));
    } catch {}
  };

  const openFullPage = (id) => {
    const candidate = state.byId.get(String(id));
    if (candidate) cacheCandidateDetails(candidate);
    window.location.href = `index.html?page=candidate-resume&resume_id=${encodeURIComponent(id)}`;
  };

  const deleteResume = async (id, name) => {
    if (!confirm(`Delete "${name || "this resume"}"?`)) return;

    const endpoints = [
      { method: "DELETE", url: `${API}/resumes/${encodeURIComponent(id)}` },
      { method: "POST", url: `${API}/resumes/${encodeURIComponent(id)}/delete` },
      { method: "POST", url: `${API}/ats/resumes/${encodeURIComponent(id)}/delete` },
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
      } catch {}
    }

    if (!ok) {
      alert("Delete endpoint not found on backend. Add DELETE /resumes/{id} to enable delete.");
      return;
    }

    state.shortlist.delete(String(id));
    saveShortlist();
    localStorage.setItem("resume_updated", Date.now().toString());

    await loadResumes();
    await loadForJob(state.activeJobId);
  };

  const createRow = (c) => {
    const topSkills = (c.matched_skills || []).slice(0, 3);
    const restCount = Math.max(0, (c.matched_skills || []).length - topSkills.length);
    const skillsHtml =
      topSkills.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join("") +
      (restCount
        ? `<button class="chip more" type="button" data-action="skills" data-id="${c.id}">+${restCount}</button>`
        : "");

    const overall = Math.round(Number(c.overall_score || 0));
    const sm = Math.round(Number(c.skill_match || 0));
    const isRanked = c.source === "ranked";

    const rankCls =
      c.rank === 1
        ? "rank-pill gold"
        : c.rank === 2
          ? "rank-pill silver"
          : c.rank === 3
            ? "rank-pill bronze"
            : "rank-pill";

    const tag = scoreLabel(overall);
    const starred = state.shortlist.has(String(c.id)) ? " starred" : "";

    return `
      <tr data-row="${c.id}">
        <td><span class="radio"></span></td>
        <td>${isRanked ? `<div class="${rankCls}">${c.rank}</div>` : `<div class="rank-pill">—</div>`}</td>
        <td>
          <div class="cand-name">${escapeHtml(c.name)}</div>
          <div class="cand-email">${escapeHtml(c.email)}</div>
        </td>
        <td>
          <div class="chips-row">${skillsHtml || `<span class="muted">—</span>`}</div>
        </td>
        <td>${escapeHtml(c.experience || "—")}</td>
        <td>
          ${
            isRanked
              ? `
                <div class="skillbar">
                  <div class="bar"><div class="fill" style="width:${Math.max(0, Math.min(100, sm))}%;"></div></div>
                  <div class="pct">${sm}%</div>
                </div>
              `
              : `<span class="muted">—</span>`
          }
        </td>
        <td>
          ${
            isRanked
              ? `
                <div class="score">
                  <div class="score-val" style="color:${overall >= 85 ? "#16a34a" : overall >= 70 ? "#f59e0b" : "#ef4444"}">${overall}%</div>
                  <span class="score-tag ${tag.c}">${tag.t}</span>
                </div>
              `
              : `<span class="muted">—</span>`
          }
        </td>
        <td>
          <div class="actions">
            <button class="icon-pill" type="button" data-action="file" data-id="${c.id}" title="Open Full Page">
              <i data-lucide="file-text"></i>
            </button>
            <button class="icon-pill" type="button" data-action="eye" data-id="${c.id}" title="Quick View">
              <i data-lucide="eye"></i>
            </button>
            <button class="icon-pill${starred}" type="button" data-action="star" data-id="${c.id}" title="Shortlist">
              <i data-lucide="star"></i>
            </button>
            <button class="icon-pill" type="button" data-action="delete" data-id="${c.id}" title="Delete Resume">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  };

  const syncStars = () => {
    if (!els.tbody) return;
    const btns = els.tbody.querySelectorAll('[data-action="star"]');
    btns.forEach((b) => {
      const id = String(b.getAttribute("data-id") || "");
      if (state.shortlist.has(id)) b.classList.add("starred");
      else b.classList.remove("starred");
    });
  };

  const renderTable = () => {
    if (!els.tbody) return;

    const filtered = applyFilters(state.candidates);
    state.byId.clear();
    filtered.forEach((c) => state.byId.set(String(c.id), c));

    els.tbody.innerHTML = filtered.map(createRow).join("");
    setCount(filtered.length);
    syncStars();

    if (window.lucide) lucide.createIcons();
  };

  const hideModalSection = (el) => {
    if (!el) return;
    const wrap =
      el.closest(".modal-block") ||
      el.closest(".kv") ||
      el.parentElement;
    if (wrap) wrap.style.display = "none";
  };

  const openModal = (c) => {
    if (!els.modal) return;

    els.modal.setAttribute("aria-hidden", "false");

    if (els.modalName) els.modalName.textContent = c.name || "—";
    if (els.modalEmail) els.modalEmail.textContent = c.email || "—";
    if (els.modalOverall) els.modalOverall.textContent = c.source === "ranked" ? `${Math.round(Number(c.overall_score || 0))}%` : "—";
    if (els.modalSkill) els.modalSkill.textContent = c.source === "ranked" ? `${Math.round(Number(c.skill_match || 0))}%` : "—";

    const base = Number(c.overall_score || 0) * 0.6 + Number(c.skill_match || 0) * 0.4;

    if (els.modalShort) els.modalShort.textContent = c.source === "ranked" ? `${Math.max(0, Math.min(100, Math.round(base)))}%` : "—";
    if (els.modalExp) els.modalExp.textContent = c.experience || "—";

    // hide education + certifications from eye modal
    hideModalSection(els.modalEdu);
    hideModalSection(els.modalCerts);

    const matched = (c.matched_skills || []).slice(0, 12);
    const extra = (c.extra_skills || []).slice(0, 12);

    if (els.modalMatched) {
      els.modalMatched.innerHTML = matched.length
        ? matched.map((s) => chipHtml(s, "green")).join("")
        : `<span class="muted">—</span>`;
    }

    if (els.modalExtra) {
      els.modalExtra.innerHTML = extra.length
        ? extra.map((s) => chipHtml(s, "blue")).join("")
        : `<span class="muted">—</span>`;
    }

    if (els.modalCerts) {
      els.modalCerts.innerHTML = "";
    }
    if (els.modalEdu) {
      els.modalEdu.textContent = "";
    }
  };

  const closeModal = () => {
    if (els.modal) els.modal.setAttribute("aria-hidden", "true");
  };

  const toggleStar = (id) => {
    const sid = String(id);
    if (state.shortlist.has(sid)) state.shortlist.delete(sid);
    else state.shortlist.add(sid);
    saveShortlist();
    syncStars();
  };

  const onTableClick = async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    if (!id) return;

    if (action === "file") {
      openFullPage(id);
      return;
    }

    if (action === "star") {
      toggleStar(id);
      return;
    }

    if (action === "delete") {
      const c = state.byId.get(String(id));
      await deleteResume(id, c?.name || "");
      return;
    }

    if (action === "eye" || action === "skills") {
      const c = state.byId.get(String(id));
      if (c) openModal(c);
    }
  };

  const loadForJob = async (jobId) => {
    state.activeJobId = String(jobId || "");

    if (!state.activeJobId) {
      state.candidates = buildCandidatesFromAllResumes();
      renderTable();
      return;
    }

    const ranked = await getRanked(state.activeJobId);
    state.candidates = buildCandidatesFromRanked(ranked);
    renderTable();
  };

  const initEls = () => {
    els.jobSelect = document.getElementById("job-select");
    els.scoreSelect = document.getElementById("score-filter");
    els.searchInput = document.getElementById("candidate-search");
    els.tbody = document.getElementById("ranked-candidates-body");
    els.countText = document.getElementById("candidates-count");
    els.exportBtn = document.getElementById("export-csv");

    els.modal = document.getElementById("candidate-modal");
    els.modalName = document.getElementById("modal-name");
    els.modalEmail = document.getElementById("modal-email");
    els.modalOverall = document.getElementById("modal-overall");
    els.modalSkill = document.getElementById("modal-skillmatch");
    els.modalShort = document.getElementById("modal-shortprob");
    els.modalExp = document.getElementById("modal-exp");
    els.modalEdu = document.getElementById("modal-edu");
    els.modalMatched = document.getElementById("modal-matched");
    els.modalExtra = document.getElementById("modal-extra");
    els.modalCerts = document.getElementById("modal-certs");
  };

  const exportCSV = () => {
    const rows = applyFilters(state.candidates);
    const header = [
      "Rank",
      "Name",
      "Email",
      "Experience",
      "Education",
      "Skill Match",
      "Overall Score",
      "Matched Skills",
      "Extra Skills",
      "Shortlisted",
    ];

    const esc = (v) => {
      const s = String(v ?? "");
      if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
      return s;
    };

    const lines = [header.join(",")];

    for (const c of rows) {
      lines.push(
        [
          c.source === "ranked" ? c.rank : "",
          c.name,
          c.email,
          c.experience,
          c.education,
          c.source === "ranked" ? Math.round(Number(c.skill_match || 0)) + "%" : "",
          c.source === "ranked" ? Math.round(Number(c.overall_score || 0)) + "%" : "",
          (c.matched_skills || []).join(" | "),
          (c.extra_skills || []).join(" | "),
          state.shortlist.has(String(c.id)) ? "Yes" : "No",
        ].map(esc).join(",")
      );
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "candidates.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const bindPageEvents = () => {
    if (state.pageBound) return;
    state.pageBound = true;

    els.jobSelect?.addEventListener("change", async () => {
      try {
        await loadForJob(els.jobSelect.value);
      } catch (error) {
        console.error("Candidates job filter failed:", error);
        state.candidates = [];
        renderTable();
      }
    });

    els.scoreSelect?.addEventListener("change", () => {
      state.scoreFilter = els.scoreSelect.value || "";
      renderTable();
    });

    els.searchInput?.addEventListener("input", () => {
      state.search = els.searchInput.value || "";
      renderTable();
    });

    els.tbody?.addEventListener("click", onTableClick);
    els.exportBtn?.addEventListener("click", exportCSV);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.modal?.getAttribute("aria-hidden") === "false") {
        closeModal();
      }
    });

    els.modal?.addEventListener("click", (e) => {
      const closeBtn = e.target.closest("[data-close='1']");
      if (closeBtn) closeModal();
    });
  };

  const bindFocusRefresh = () => {
    if (state.focusBound) return;
    state.focusBound = true;

    window.addEventListener("focus", async () => {
      const updated = localStorage.getItem("resume_updated");
      if (!updated) return;

      localStorage.removeItem("resume_updated");

      try {
        await loadResumes();
        await loadJobs();

        if (els.jobSelect) {
          els.jobSelect.value = state.activeJobId || "";
        }

        await loadForJob(state.activeJobId);
      } catch (error) {
        console.error("Candidates refresh failed:", error);
      }
    });
  };

  const boot = async () => {
    initEls();

    if (!els.tbody) {
      console.error("Candidates page HTML not loaded yet.");
      return;
    }

    loadShortlist();
    state.pageBound = false;
    bindPageEvents();
    bindFocusRefresh();

    state.search = "";
    state.scoreFilter = "";
    state.activeJobId = "";

    if (els.searchInput) els.searchInput.value = "";
    if (els.scoreSelect) els.scoreSelect.value = "";
    if (els.jobSelect) els.jobSelect.value = "";

    await loadJobs();
    await loadResumes();

    if (els.jobSelect) els.jobSelect.value = "";

    try {
      await loadForJob("");
    } catch (error) {
      console.error("Candidates boot failed:", error);
      state.candidates = [];
      renderTable();
    }
  };

  window.loadCandidates = boot;
})();