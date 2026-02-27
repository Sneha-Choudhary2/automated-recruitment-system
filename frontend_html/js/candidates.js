// candidates.js (FIXED ICONS + FULL PAGE OPEN + DELETE BUTTON)
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
  };

  const storageKey = "recruitai_shortlist_ids";

  const fetchJSON = async (url, opts) => {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(res.status + " " + url);
    return await res.json();
  };

  const setCount = (n) => {
    if (els.countText) els.countText.textContent = String(n);
  };

  const loadShortlist = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.forEach((id) => state.shortlist.add(String(id)));
    } catch {}
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
    if (Array.isArray(x)) return x.map(String).filter(Boolean);
    if (typeof x === "string") return x.split(/[,|\n]/).map((s) => s.trim()).filter(Boolean);
    return [];
  };

  // backend gives extracted_text (important!)
  const getResumeText = (resume) =>
    resume?.extracted_text || resume?.resume_text || resume?.text || resume?.content || "";

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
      (t.match(/\b(Master'?s|Bachelor'?s|B\.?Tech|M\.?Tech|B\.?E|M\.?E|B\.?Sc|M\.?Sc|MBA|Ph\.?D)\b[^\n]{0,40}/i) ||
        [])[0] || "";
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
      kind === "green" ? "chip chip-green" : kind === "blue" ? "chip chip-blue" : "chip chip-gray";
    return `<span class="${cls}">${escapeHtml(txt)}</span>`;
  };

  // ✅ IMPORTANT: backend returns array for /ats/rank-resumes
  const getRanked = async (jobId) => {
    const payload = { job_id: Number(jobId) };
    const res = await fetch(API + "/ats/rank-resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
      state.jobs.map((j) => `<option value="${j.id}">${escapeHtml(j.title || "Job " + j.id)}</option>`).join("");
  };

  const loadResumes = async () => {
    const resumes = await fetchJSON(API + "/resumes/");
    state.resumes = Array.isArray(resumes) ? resumes : [];
  };

  // ✅ adapt to your backend fields: match_score + similarity_score + extracted_text
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
        r.filename ||
        resume?.filename ||
        resume?.file_name ||
        "—";

      const resumeText = getResumeText(resume);
      const parsed = extractFromResumeText(resumeText);

      // you don’t have matched_skills from API right now → we display simple top keywords if you want,
      // but keep existing behavior: show skills if present else show "—"
      const matched = normalizeSkills(r.matched_skills || r.matchedSkills || r.skills_matched || []);
      const extra = normalizeSkills(r.extra_skills || r.extraSkills || r.additional_skills || []);

      const overall = Number(r.match_score ?? r.overall_score ?? r.score ?? 0);
      const skillMatch = Number(r.similarity_score ?? r.skill_match ?? 0); // ✅ USE similarity_score

      const expYears = parsed.years || null;

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
        skill_match: isFinite(skillMatch) ? skillMatch : 0,
        overall_score: isFinite(overall) ? overall : 0,
      });
    }

    return out;
  };

  const applyFilters = (list) => {
    const q = state.search.trim().toLowerCase();
    const score = state.scoreFilter;

    return (list || []).filter((c) => {
      if (q) {
        const hay = [c.name, c.email, ...(c.matched_skills || []), ...(c.extra_skills || [])]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (score) {
        const s = scoreLabel(c.overall_score).c;
        if (s !== score) return false;
      }

      return true;
    });
  };

  // ✅ FILE icon opens full resume page
  const openFullPage = (id) => {
    const url = `index.html?page=candidate-resume&resume_id=${encodeURIComponent(id)}`;
    window.location.href = url;
  };

  // ✅ delete resume (best-effort endpoints)
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

    // remove from shortlist
    state.shortlist.delete(String(id));
    saveShortlist();

    // refresh list
    await loadResumes();
    await loadForJob(state.activeJobId || state.jobs[0]?.id || "");
  };

  const createRow = (c) => {
    const topSkills = (c.matched_skills || []).slice(0, 3);
    const restCount = Math.max(0, (c.matched_skills || []).length - topSkills.length);
    const skillsHtml =
      topSkills.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join("") +
      (restCount ? `<button class="chip more" type="button" data-action="skills" data-id="${c.id}">+${restCount}</button>` : "");

    const overall = Math.round(Number(c.overall_score || 0));
    const sm = Math.round(Number(c.skill_match || 0));
    const rankCls =
      c.rank === 1 ? "rank-pill gold" : c.rank === 2 ? "rank-pill silver" : c.rank === 3 ? "rank-pill bronze" : "rank-pill";

    const tag = scoreLabel(overall);
    const starred = state.shortlist.has(String(c.id)) ? " starred" : "";

    // ✅ LUCIDE ICONS (these will render properly after lucide.createIcons())
    return `
      <tr data-row="${c.id}">
        <td><span class="radio"></span></td>
        <td><div class="${rankCls}">${c.rank}</div></td>
        <td>
          <div class="cand-name">${escapeHtml(c.name)}</div>
          <div class="cand-email">${escapeHtml(c.email)}</div>
        </td>
        <td>
          <div class="chips-row">${skillsHtml || `<span class="muted">—</span>`}</div>
        </td>
        <td>${escapeHtml(c.experience || "—")}</td>
        <td>
          <div class="skillbar">
            <div class="bar"><div class="fill" style="width:${Math.max(0, Math.min(100, sm))}%;"></div></div>
            <div class="pct">${sm}%</div>
          </div>
        </td>
        <td>
          <div class="score">
            <div class="score-val" style="color:${overall>=85?"#16a34a":overall>=70?"#f59e0b":overall>=50?"#ef4444":"#ef4444"}">${overall}%</div>
            <span class="score-tag ${tag.c}">${tag.t}</span>
          </div>
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

    // ✅ IMPORTANT: render lucide icons after HTML injection
    if (window.lucide) lucide.createIcons();
  };

  const openModal = (c) => {
    els.modal.setAttribute("aria-hidden", "false");

    els.modalName.textContent = c.name || "—";
    els.modalEmail.textContent = c.email || "—";

    els.modalOverall.textContent = `${Math.round(Number(c.overall_score || 0))}%`;
    els.modalSkill.textContent = `${Math.round(Number(c.skill_match || 0))}%`;

    // you don’t have shortlist_prob from API, so show computed (same as full page)
    const base = (Number(c.overall_score || 0) * 0.6) + (Number(c.skill_match || 0) * 0.4);
    els.modalShort.textContent = `${Math.max(0, Math.min(100, Math.round(base)))}%`;

    els.modalExp.textContent = c.experience || "—";
    els.modalEdu.textContent = c.education || "—";

    const matched = (c.matched_skills || []).slice(0, 12);
    const extra = (c.extra_skills || []).slice(0, 12);
    const certs = (c.certifications || []).slice(0, 10);

    els.modalMatched.innerHTML = matched.length ? matched.map((s) => chipHtml(s, "green")).join("") : `<span class="muted">—</span>`;
    els.modalExtra.innerHTML = extra.length ? extra.map((s) => chipHtml(s, "blue")).join("") : `<span class="muted">—</span>`;
    els.modalCerts.innerHTML = certs.length ? certs.map((s) => chipHtml(s, "gray")).join("") : `<span class="muted">—</span>`;
  };

  const closeModal = () => els.modal.setAttribute("aria-hidden", "true");

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

    if (action === "file") return openFullPage(id);
    if (action === "eye") {
      const c = state.byId.get(String(id));
      if (c) openModal(c);
      return;
    }
    if (action === "star") return toggleStar(id);
    if (action === "skills") {
      const c = state.byId.get(String(id));
      if (c) openModal(c);
      return;
    }
    if (action === "delete") {
      const c = state.byId.get(String(id));
      return deleteResume(id, c?.name || "");
    }
  };

  const loadForJob = async (jobId) => {
    state.activeJobId = String(jobId || "");
    const useJobId = state.activeJobId || String(state.jobs?.[0]?.id || "");
    const ranked = useJobId ? await getRanked(useJobId) : [];
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
    const header = ["Rank","Name","Email","Experience","Education","Skill Match","Overall Score","Matched Skills","Extra Skills","Shortlisted"];

    const esc = (v) => {
      const s = String(v ?? "");
      if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
      return s;
    };

    const lines = [header.join(",")];
    for (const c of rows) {
      lines.push([
        c.rank,
        c.name,
        c.email,
        c.experience,
        c.education,
        Math.round(Number(c.skill_match || 0)) + "%",
        Math.round(Number(c.overall_score || 0)) + "%",
        (c.matched_skills || []).join(" | "),
        (c.extra_skills || []).join(" | "),
        state.shortlist.has(String(c.id)) ? "Yes" : "No",
      ].map(esc).join(","));
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

  const bind = () => {
    els.jobSelect?.addEventListener("change", async () => {
      try {
        await loadForJob(els.jobSelect.value);
      } catch {
        state.candidates = [];
        renderTable();
      }
    });

    els.scoreSelect?.addEventListener("change", () => {
      state.scoreFilter = els.scoreSelect.value;
      renderTable();
    });

    els.searchInput?.addEventListener("input", () => {
      state.search = els.searchInput.value || "";
      renderTable();
    });

    els.tbody?.addEventListener("click", onTableClick);
    els.exportBtn?.addEventListener("click", exportCSV);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.modal?.getAttribute("aria-hidden") === "false") closeModal();
    });

    els.modal?.addEventListener("click", (e) => {
      const closeBtn = e.target.closest("[data-close='1']");
      if (closeBtn) closeModal();
    });
  };

  const boot = async () => {
    initEls();
    loadShortlist();
    bind();

    await loadJobs();
    await loadResumes();

    const initialJob = els.jobSelect?.value || (state.jobs[0]?.id || "");
    try {
      await loadForJob(initialJob);
    } catch {
      state.candidates = [];
      renderTable();
    }
  };

  // ✅ expose for layout.js SPA handler
  window.loadCandidates = boot;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();