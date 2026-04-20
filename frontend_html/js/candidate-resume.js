(() => {
  const API = (window.API_BASE || window.API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

  const storageKey = "recruitai_shortlist_ids";
  const detailCacheKey = "recruitai_candidate_detail_cache";

  const els = {
    name: null,
    overall: null,
    skill: null,
    exp: null,
    short: null,
    contact: null,
    edu: null,
    certs: null,
    skills: null,
    extraSkills: null,
    work: null,
    text: null,
    analysis: null,
    aiDetect: null,
    shortlistBtn: null,
    downloadBtn: null,
    deleteBtn: null,
  };

  let resumeId = "";
  let currentResume = null;
  let cachedCandidate = null;
  let shortlistSet = new Set();

  const fetchJSON = async (url, opts) => {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return await res.json();
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const setText = (el, value) => {
    if (!el) return;
    el.textContent = value || "—";
  };

  const setHtml = (el, html) => {
    if (!el) return;
    el.innerHTML = html;
  };

  const normalizeSkills = (x) => {
    if (!x) return [];
    if (Array.isArray(x)) return x.map(String).map((s) => s.trim()).filter(Boolean);
    if (typeof x === "string") {
      return x
        .split(/[,|\n•]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  const dedupeList = (items) => {
    const seen = new Set();
    const out = [];

    for (const item of items || []) {
      const value = String(item || "").trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(value);
    }

    return out;
  };

  const splitLines = (text) =>
    String(text || "")
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const getResumeText = (resume) =>
    resume?.extracted_text ||
    resume?.resume_text ||
    resume?.text ||
    resume?.content ||
    resume?.parsed_text ||
    "";

  const readCachedCandidate = (id) => {
    try {
      const raw = localStorage.getItem(detailCacheKey);
      if (!raw) return null;
      const map = JSON.parse(raw);
      return map?.[String(id)] || null;
    } catch {
      return null;
    }
  };

  const loadShortlist = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        shortlistSet = new Set(arr.map((id) => String(id)));
      }
    } catch {
      shortlistSet = new Set();
    }
  };

  const saveShortlist = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(shortlistSet)));
    } catch {}
  };

  const getFileUrl = (resume) =>
    resume?.file_url ||
    resume?.resume_url ||
    resume?.file_path ||
    resume?.url ||
    "";

  const guessYears = (text) => {
    if (!text) return null;

    const t = String(text);
    const m1 = t.match(/(\d+(?:\.\d+)?)\+?\s*(?:years|yrs)\s+(?:of\s+)?experience/i);
    if (m1) return Math.round(Number(m1[1]));

    const m2 = t.match(/experience\s*[:\-]?\s*(\d+(?:\.\d+)?)\+?\s*(?:years|yrs)/i);
    if (m2) return Math.round(Number(m2[1]));

    const m3 = t.match(/(\d+(?:\.\d+)?)\+?\s*(?:years|yrs)\b/i);
    if (m3) return Math.round(Number(m3[1]));

    return null;
  };

  const extractEmail = (text) => {
    const t = String(text || "");
    return (t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || "";
  };

  const extractPhone = (text) => {
    const t = String(text || "");
    const match = t.match(/(?:\+?\d{1,3}[\s\-]?)?(?:\(?\d{3}\)?[\s\-]?)?\d{3}[\s\-]?\d{4}/);
    return match ? match[0] : "";
  };

  const extractLinkedIn = (text) => {
    const t = String(text || "");
    const match = t.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|)]+/i);
    return match ? match[0] : "";
  };

  const extractLocation = (text) => {
    const lines = splitLines(text).slice(0, 8);
    for (const line of lines) {
      if (/@/.test(line) || /linkedin/i.test(line) || /\d{3}[\s\-]?\d{4}/.test(line)) continue;
      if (
        /\b[A-Z][a-z]+,\s*[A-Z]{2}\b/.test(line) ||
        /\b(?:India|USA|United States|California|Texas|New York|Seattle|Chicago|San Francisco)\b/i.test(line)
      ) {
        return line;
      }
    }
    return "";
  };

  const findSection = (text, sectionNames) => {
    const lines = splitLines(text);
    if (!lines.length) return [];

    const stopPattern = /^(summary|skills|technical skills|education|certifications|certification|projects|experience|work experience|professional experience|employment|achievements|awards|publications|languages)$/i;
    const startPatterns = sectionNames.map((name) => new RegExp(`^${name}\\b[:\\-]?$`, "i"));

    let startIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (startPatterns.some((p) => p.test(lines[i]))) {
        startIndex = i;
        break;
      }
    }

    if (startIndex === -1) return [];

    const result = [];
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (stopPattern.test(line) && result.length > 0) break;
      result.push(line);
    }

    return result;
  };

  const detectAiPattern = (text) => {
    const t = String(text || "");
    const lower = t.toLowerCase();

    let score = 0;

    const longSentenceMatches = t.match(/[^.!?]{260,}[.!?]/g) || [];
    if (longSentenceMatches.length >= 4) score += 12;

    const repetitivePhrases = [
      "proven track record",
      "results-driven",
      "highly motivated",
      "detail-oriented",
      "leveraged",
      "utilized",
      "cross-functional"
    ];

    for (const phrase of repetitivePhrases) {
      if (lower.includes(phrase)) score += 3;
    }

    const bulletCount = (t.match(/^[•\-]/gm) || []).length;
    if (bulletCount >= 12) score += 5;

    const uniformBullets = splitLines(t).filter((line) => /^[•\-]/.test(line) && line.length > 110).length;
    if (uniformBullets >= 8) score += 8;

    if (score >= 28) return { type: "Possibly AI-assisted", risk: "Medium", score };
    if (score >= 16) return { type: "Mixed / AI-assisted", risk: "Low", score };
    return { type: "Likely Human-written", risk: "Low", score };
  };

  const cleanSkillText = (text) =>
    String(text || "")
      .replace(/^programming\s*&\s*scripting\s*:?/i, "")
      .replace(/^skills\s*:?/i, "")
      .replace(/^technical skills\s*:?/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();

  const extractSkills = (resume, text) => {
    const fromResume = dedupeList(
      normalizeSkills(
        resume?.skills ||
        resume?.matched_skills ||
        resume?.parsed_skills ||
        resume?.all_skills ||
        []
      )
    );
    if (fromResume.length) return fromResume;

    const skillSection = findSection(text, ["skills", "technical skills"]);
    if (skillSection.length) {
      const combined = skillSection.join(" | ");
      const rawParts = combined
        .split(/[|,•]/)
        .map((s) => cleanSkillText(s))
        .filter(Boolean)
        .filter((s) => s.length < 45)
        .filter((s) => !/[.;]{2,}/.test(s))
        .filter((s) => !/^summary$/i.test(s));

      return dedupeList(rawParts).slice(0, 50);
    }

    return [];
  };

  const extractEducation = (resume, text) => {
    if (resume?.education) return String(resume.education).trim();

    const lines = findSection(text, ["education"]);
    if (lines.length) return lines.slice(0, 4).join("\n");

    const allLines = splitLines(text);
    const eduMatches = allLines.filter((line) =>
      /\b(Bachelor|Master|B\.?Tech|M\.?Tech|B\.?E|M\.?E|B\.?Sc|M\.?Sc|MBA|Ph\.?D|University|College)\b/i.test(line)
    );

    return eduMatches.slice(0, 4).join("\n");
  };

  const extractCertifications = (resume, text) => {
    const fromResume = dedupeList(normalizeSkills(resume?.certifications || []));
    if (fromResume.length) return fromResume;

    const section = findSection(text, ["certifications", "certification"]);
    if (section.length) {
      const raw = section
        .flatMap((line) => line.split(/[|,•]/))
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s) => s.length < 80)
        .filter((s) => !/experience|summary|project|engineer|developer/i.test(s));

      return dedupeList(raw).slice(0, 15);
    }

    return [];
  };

  const extractWorkExperience = (resume, text) => {
    if (resume?.work_experience) return String(resume.work_experience).trim();

    const lines = findSection(text, ["professional experience", "work experience", "experience", "employment"]);
    if (lines.length) return lines.slice(0, 40).join("\n");

    return "";
  };

  const extractName = (resume, text) =>
    resume?.candidate_name ||
    resume?.name ||
    resume?.filename ||
    resume?.file_name ||
    splitLines(text)[0] ||
    "Candidate";

  const renderChipList = (items) => {
    const list = dedupeList(items);
    if (!list.length) return "—";
    return list.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("");
  };

  const nlToHtml = (text) => {
    const lines = splitLines(text);
    if (!lines.length) return "—";
    return lines.map((line) => `<div style="margin-bottom:8px;">${escapeHtml(line)}</div>`).join("");
  };

  const formatWorkExperience = (text) => {
    const lines = splitLines(text);
    if (!lines.length) return "No detailed work experience available.";

    const out = [];
    for (const line of lines) {
      const isHeading =
        /(?:present|\d{4}|\bengineer\b|\bdeveloper\b|\bscientist\b|\bmanager\b|\bintern\b)/i.test(line) &&
        line.length < 120;

      if (isHeading) {
        out.push(`<div style="margin-top:12px; font-weight:700;">${escapeHtml(line)}</div>`);
      } else if (/^[•\-]/.test(line)) {
        out.push(`<div style="margin-top:6px; padding-left:10px;">${escapeHtml(line)}</div>`);
      } else {
        out.push(`<div style="margin-top:6px;">${escapeHtml(line)}</div>`);
      }
    }

    return out.join("");
  };

  const updateShortlistButton = () => {
    if (!els.shortlistBtn) return;

    const active = shortlistSet.has(String(resumeId));
    els.shortlistBtn.classList.toggle("active", active);
    els.shortlistBtn.innerHTML = `
      <i data-lucide="star"></i>
      ${active ? "Shortlisted" : "Shortlist"}
    `;

    if (window.lucide) lucide.createIcons();
  };

  const buildAnalysisHtml = ({ matchedSkills, extraSkills, overallScore, skillMatch, yearsText }) => {
    return `
      <div><strong>Overall Score:</strong> ${overallScore !== null ? `${Math.round(overallScore)}%` : "—"}</div>
      <div style="margin-top:8px;"><strong>Skill Match:</strong> ${skillMatch !== null ? `${Math.round(skillMatch)}%` : "—"}</div>
      <div style="margin-top:8px;"><strong>Experience:</strong> ${escapeHtml(yearsText || "—")}</div>
      <div style="margin-top:8px;"><strong>Matched Skills:</strong> ${matchedSkills.length ? escapeHtml(matchedSkills.join(", ")) : "—"}</div>
      <div style="margin-top:8px;"><strong>Extra Skills:</strong> ${extraSkills.length ? escapeHtml(extraSkills.join(", ")) : "—"}</div>
    `;
  };

  const buildAiDetectHtml = (info) => {
    return `
      <div><strong>Resume Type:</strong> ${escapeHtml(info.type)}</div>
      <div style="margin-top:8px;"><strong>AI Detection Risk:</strong> ${escapeHtml(info.risk)}</div>
      <div style="margin-top:8px; color:#64748b;">
        This is a light heuristic estimate based on structure and writing pattern.
      </div>
    `;
  };

  const renderPage = (resume, candidate) => {
    const text = getResumeText(resume);

    const name = extractName(resume, text);
    const email = resume?.email || candidate?.email || extractEmail(text) || "Not found";
    const phone = resume?.phone || extractPhone(text) || "Not found";
    const linkedIn = extractLinkedIn(text) || "Not found";
    const location = extractLocation(text) || "Not found";

    const education = extractEducation(resume, text) || "—";
    const certifications = extractCertifications(resume, text);
    const allSkills = extractSkills(resume, text);
    const workExperience = extractWorkExperience(resume, text) || "No detailed work experience available.";

    const matchedSkills = dedupeList(
      normalizeSkills(
        candidate?.matched_skills ||
        resume?.matched_skills ||
        []
      )
    );

    let extraSkills = dedupeList(normalizeSkills(candidate?.extra_skills || []));
    if (!extraSkills.length) {
      const matchedSet = new Set(matchedSkills.map((s) => s.toLowerCase()));
      extraSkills = allSkills.filter((s) => !matchedSet.has(String(s).toLowerCase()));
    }

    const aiInfo = detectAiPattern(text);

    const yearsNumber =
      resume?.years_of_experience ||
      resume?.experience_years ||
      guessYears(text) ||
      null;

    const yearsText = yearsNumber ? `${yearsNumber} years` : "--";

    const overallScore =
      candidate && candidate.overall_score !== undefined && candidate.overall_score !== null
        ? Number(candidate.overall_score)
        : null;

    const skillMatch =
      candidate && candidate.skill_match !== undefined && candidate.skill_match !== null
        ? Number(candidate.skill_match)
        : null;

    const shortProb =
      overallScore !== null && skillMatch !== null
        ? Math.max(0, Math.min(100, Math.round(overallScore * 0.6 + skillMatch * 0.4)))
        : null;

    setText(els.name, name);
    setText(els.overall, overallScore !== null ? `${Math.round(overallScore)}%` : "--%");
    setText(els.skill, skillMatch !== null ? `${Math.round(skillMatch)}%` : "--%");
    setText(els.exp, yearsText);
    setText(els.short, shortProb !== null ? `${shortProb}%` : "--%");

    setHtml(
      els.contact,
      `
        <div><strong>Email:</strong> ${escapeHtml(email)}</div>
        <div style="margin-top:8px;"><strong>Phone:</strong> ${escapeHtml(phone)}</div>
        <div style="margin-top:8px;"><strong>Location:</strong> ${escapeHtml(location)}</div>
        <div style="margin-top:8px;"><strong>LinkedIn:</strong> ${escapeHtml(linkedIn)}</div>
      `
    );

    setHtml(els.edu, nlToHtml(education));
    setHtml(els.certs, renderChipList(certifications));
    setHtml(els.skills, renderChipList(allSkills));
    setHtml(els.extraSkills, renderChipList(extraSkills));
    setHtml(els.work, formatWorkExperience(workExperience));
    setText(els.text, text || "No resume content available.");

    setHtml(
      els.analysis,
      buildAnalysisHtml({
        matchedSkills,
        extraSkills,
        overallScore,
        skillMatch,
        yearsText,
      })
    );

    setHtml(els.aiDetect, buildAiDetectHtml(aiInfo));

    updateShortlistButton();

    if (window.lucide) lucide.createIcons();
  };

  const fetchResumeById = async (id) => {
    const resumes = await fetchJSON(`${API}/resumes/`);
    const list = Array.isArray(resumes) ? resumes : [];
    return list.find((r) => String(r.id) === String(id)) || null;
  };

  const deleteResume = async () => {
    const displayName =
      currentResume?.candidate_name ||
      currentResume?.filename ||
      currentResume?.file_name ||
      "this resume";

    if (!confirm(`Delete "${displayName}"?`)) return;

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
      } catch {}
    }

    if (!ok) {
      alert("Delete endpoint not found on backend. Add DELETE /resumes/{id} to enable delete.");
      return;
    }

    shortlistSet.delete(String(resumeId));
    saveShortlist();
    localStorage.setItem("resume_updated", Date.now().toString());
    window.location.href = "index.html?page=candidates";
  };

  const bindEvents = () => {
    els.shortlistBtn?.addEventListener("click", () => {
      const id = String(resumeId);
      if (shortlistSet.has(id)) shortlistSet.delete(id);
      else shortlistSet.add(id);
      saveShortlist();
      updateShortlistButton();
    });

    els.downloadBtn?.addEventListener("click", () => {
      const url = getFileUrl(currentResume);
      if (!url) {
        alert("Resume file not found.");
        return;
      }
      window.open(url, "_blank");
    });

    els.deleteBtn?.addEventListener("click", async () => {
      await deleteResume();
    });
  };

  const initEls = () => {
    els.name = document.getElementById("r-name");
    els.overall = document.getElementById("r-overall");
    els.skill = document.getElementById("r-skill");
    els.exp = document.getElementById("r-exp");
    els.short = document.getElementById("r-short");
    els.contact = document.getElementById("r-contact");
    els.edu = document.getElementById("r-edu");
    els.certs = document.getElementById("r-certs");
    els.skills = document.getElementById("r-skills");
    els.extraSkills = document.getElementById("r-extra-skills");
    els.work = document.getElementById("r-work");
    els.text = document.getElementById("r-text");
    els.analysis = document.getElementById("r-analysis");
    els.aiDetect = document.getElementById("r-ai-detect");
    els.shortlistBtn = document.getElementById("shortlistBtn");
    els.downloadBtn = document.getElementById("downloadBtn");
    els.deleteBtn = document.getElementById("deleteBtn");
  };

  const boot = async () => {
    initEls();

    const params = new URLSearchParams(window.location.search);
    resumeId = String(params.get("resume_id") || "").trim();

    if (!resumeId) {
      setText(els.name, "Candidate");
      setText(els.contact, "Resume ID not found.");
      return;
    }

    loadShortlist();
    cachedCandidate = readCachedCandidate(resumeId);

    try {
      currentResume = await fetchResumeById(resumeId);

      if (!currentResume) {
        setText(els.contact, "Resume not found.");
        return;
      }

      renderPage(currentResume, cachedCandidate);
      bindEvents();
    } catch (error) {
      console.error("Candidate resume load failed:", error);
      setText(els.contact, "Failed to load resume details.");
    }
  };

  window.getAIChatContext = function () {
    try {
      const candidateName = document.getElementById("r-name")?.textContent?.trim() || "";
      const overallText = document.getElementById("r-overall")?.textContent?.trim() || "0";
      const score = Number(String(overallText).replace("%", "").trim()) || 0;

      const resumeText = document.getElementById("r-text")?.textContent?.trim() || "";
      const matchedSkills = Array.from(document.querySelectorAll("#r-analysis")).length
        ? (() => {
            const analysisText = document.getElementById("r-analysis")?.textContent || "";
            const match = analysisText.match(/Matched Skills:\s*(.*?)(?:Extra Skills:|$)/i);
            if (!match || !match[1]) return [];
            return match[1]
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          })()
        : [];

      const extraSkills = Array.from(document.querySelectorAll("#r-extra-skills .chip"))
        .map((chip) => chip.textContent?.trim() || "")
        .filter(Boolean);

      return {
        page: "candidate-resume",
        candidate_name: candidateName || null,
        resume_text: resumeText || null,
        matched_skills: matchedSkills,
        missing_skills: extraSkills,
        score
      };
    } catch (e) {
      console.error("AI resume context error:", e);
      return {
        page: "candidate-resume",
        candidate_name: null,
        resume_text: null,
        matched_skills: [],
        missing_skills: [],
        score: null
      };
    }
  };

  window.loadCandidateResumePage = boot;
})();