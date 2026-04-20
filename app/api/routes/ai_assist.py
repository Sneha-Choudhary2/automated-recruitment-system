import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/ai-assist", tags=["AI Assist"])


class AIContext(BaseModel):
    page: Optional[str] = None
    candidate_name: Optional[str] = None
    resume_text: Optional[str] = None
    jd_text: Optional[str] = None
    matched_skills: Optional[List[str]] = None
    missing_skills: Optional[List[str]] = None
    score: Optional[float] = None
    candidates: Optional[List[Dict[str, Any]]] = None
    jobs: Optional[List[Dict[str, Any]]] = None


class AIRequest(BaseModel):
    message: str
    context: Optional[AIContext] = None


COMMON_SKILLS = [
    "python", "java", "javascript", "typescript", "sql", "mysql", "postgresql",
    "react", "node", "node.js", "fastapi", "django", "flask", "html", "css",
    "bootstrap", "tailwind", "machine learning", "deep learning", "nlp",
    "data analysis", "pandas", "numpy", "excel", "power bi", "tableau",
    "aws", "azure", "git", "github", "docker", "kubernetes", "c++", "c",
    "mongodb", "rest api", "api", "figma", "scikit-learn", "tensorflow",
    "pytorch", "linux", "gcp", "express", "graphql", "redis"
]


PAGE_GUIDES = {
    "dashboard": {
        "name": "Dashboard",
        "features": (
            "The Dashboard shows an overview of your ATS system, including total candidates, "
            "active jobs, average match score, shortlisted count, top ranked candidates, "
            "and active job positions."
        ),
        "how_to_use": (
            "Use the Dashboard to quickly monitor hiring activity, select a job to see top candidates, "
            "and use quick actions to go to Upload Resume, Job Description, or Candidates page."
        ),
    },
    "upload": {
        "name": "Upload Resume",
        "features": (
            "The Upload Resume page lets you upload PDF, DOC, or DOCX resumes, see uploaded resumes, "
            "and understand the processing pipeline such as text extraction, NLP analysis, AI detection, "
            "job matching, and shortlist prediction."
        ),
        "how_to_use": (
            "Go to Upload Resume, choose or drag a file, then upload it. After upload, the system stores "
            "the resume and extracts text so it can appear in candidates, resume details, and ranking."
        ),
    },
    "jd": {
        "name": "Job Description",
        "features": (
            "The Job Description page lets you create, edit, delete, and manage saved jobs with title, "
            "description text, and deadline."
        ),
        "how_to_use": (
            "Go to the Job Description page, enter the title, paste the job description, optionally add a deadline, "
            "and save it. Saved jobs can later be used for candidate ranking."
        ),
    },
    "job-description": {
        "name": "Job Description",
        "features": (
            "The Job Description page lets you create, edit, delete, and manage saved jobs with title, "
            "description text, and deadline."
        ),
        "how_to_use": (
            "Go to the Job Description page, enter the title, paste the job description, optionally add a deadline, "
            "and save it. Saved jobs can later be used for candidate ranking."
        ),
    },
    "candidates": {
        "name": "Candidates",
        "features": (
            "The Candidates page shows uploaded resumes, ranking, search, filters, CSV export, delete action, "
            "quick eye modal, shortlist option, and full resume page access."
        ),
        "how_to_use": (
            "Go to Candidates page, optionally select a job, review ranked candidates, use search or score filters, "
            "open quick view with the eye icon, or open full resume details from the file icon."
        ),
    },
    "candidate-resume": {
        "name": "Resume",
        "features": (
            "The Resume page shows detailed extracted information for a selected candidate, such as contact details, "
            "education, certifications, skills, extra skills, work experience, full resume content, score analysis, "
            "and AI or human writing indication."
        ),
        "how_to_use": (
            "Open the Resume page from a candidate action. Use it when you want full details instead of only quick view."
        ),
    },
    "resume": {
        "name": "Resume",
        "features": (
            "The Resume page shows detailed extracted information for a selected candidate, such as contact details, "
            "education, certifications, skills, extra skills, work experience, full resume content, score analysis, "
            "and AI or human writing indication."
        ),
        "how_to_use": (
            "Open the Resume page from a candidate action. Use it when you want full details instead of only quick view."
        ),
    },
}


def normalize_text(text: Optional[str]) -> str:
    return (text or "").strip()


def simplify_text(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_page_name(page: Optional[str]) -> str:
    p = simplify_text(page or "")
    if not p:
        return "dashboard"

    if "upload" in p:
        return "upload"
    if "job" in p or "jd" in p:
        return "jd"
    if "candidate resume" in p or "resume" in p:
        return "resume"
    if "candidate" in p:
        return "candidates"
    if "dashboard" in p or "home" in p:
        return "dashboard"
    return p


def extract_email(text: str) -> Optional[str]:
    match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    return match.group(0) if match else None


def extract_phone(text: str) -> Optional[str]:
    match = re.search(r"(\+?\d[\d\-\s()]{8,}\d)", text)
    return match.group(0).strip() if match else None


def extract_skills_from_text(text: str) -> List[str]:
    lower = (text or "").lower()
    found: List[str] = []

    for skill in COMMON_SKILLS:
        if skill.lower() in lower:
            found.append(skill)

    seen = set()
    unique = []
    for item in found:
        key = item.lower()
        if key not in seen:
            seen.add(key)
            unique.append(item)

    return unique


def summarize_text(text: str, max_lines: int = 3) -> str:
    cleaned = re.sub(r"\n{2,}", "\n", text or "").strip()
    if not cleaned:
        return ""

    lines = [line.strip() for line in cleaned.splitlines() if line.strip()]
    meaningful = []

    for line in lines:
        if len(line) >= 25:
            meaningful.append(line)
        if len(meaningful) >= max_lines:
            break

    if not meaningful:
        return cleaned[:300] + ("..." if len(cleaned) > 300 else "")

    joined = " ".join(meaningful)
    return joined[:500] + ("..." if len(joined) > 500 else "")


def extract_experience_hint(text: str) -> str:
    lower = (text or "").lower()

    years = re.findall(r"(\d+)\+?\s+years?", lower)
    if years:
        max_year = max(int(y) for y in years)
        return f"The resume mentions around {max_year}+ years of experience."

    if "experience" in lower:
        return "The resume mentions experience, but the total years are not clearly stated."

    return "I could not clearly find total years of experience in the resume."


def extract_required_skills_from_jd(jd_text: str) -> List[str]:
    return extract_skills_from_text(jd_text)


def list_candidate_names(candidates: List[Dict[str, Any]], limit: int = 10) -> List[str]:
    names = []
    for c in candidates:
        name = str(c.get("name") or c.get("candidate_name") or "").strip()
        if name:
            names.append(name)
    return names[:limit]


def list_job_titles(jobs: List[Dict[str, Any]], limit: int = 10) -> List[str]:
    titles = []
    for j in jobs:
        title = str(j.get("title") or f"Job {j.get('id')}").strip()
        if title:
            titles.append(title)
    return titles[:limit]


def simplify_name(value: str) -> str:
    return simplify_text(value).replace(" ", "")


def find_candidate_by_name(candidates: List[Dict[str, Any]], target_name: str) -> Optional[Dict[str, Any]]:
    target_simple = simplify_name(target_name)
    if not target_simple:
        return None

    best = None

    for c in candidates:
        raw_name = str(c.get("name") or c.get("candidate_name") or "").strip()
        candidate_simple = simplify_name(raw_name)

        if not candidate_simple:
            continue

        if candidate_simple == target_simple:
            return c

        if target_simple in candidate_simple or candidate_simple in target_simple:
            best = c

    return best


def detect_candidate_query_name(question: str) -> Optional[str]:
    q = simplify_text(question)

    patterns = [
        r"(?:give info about|tell me about|show info about|show details of|show details about)\s+(.+)",
        r"(?:who is)\s+(.+)",
        r"(?:what is)\s+(.+?)\s+(?:email|phone|mobile|number|contact details|contact info|contact information)",
        r"(.+?)\s+(?:email|phone|mobile|number|contact details|contact info|contact information)$",
    ]

    for pattern in patterns:
        match = re.search(pattern, q)
        if match:
            value = match.group(1).strip()
            value = re.sub(r"\b(candidate|resume)\b", "", value).strip()
            if value:
                return value

    return None


def detect_target_page(question: str, current_page: str) -> str:
    q = simplify_text(question)

    if "dashboard" in q:
        return "dashboard"
    if "upload" in q:
        return "upload"
    if "job description" in q or q == "jd" or "job page" in q:
        return "jd"
    if "candidate page" in q or "candidates page" in q:
        return "candidates"
    if "resume page" in q or ("resume" in q and "page" in q):
        return "resume"

    return current_page


def is_page_help_question(question: str) -> bool:
    q = simplify_text(question)

    return any(
        phrase in q
        for phrase in [
            "what does this page do",
            "what does this do",
            "what is this page",
            "page info",
            "page information",
            "page features",
            "what are the features",
            "what can i do here",
            "how to use this page",
            "how do i use this page",
            "which page",
            "where do i go",
            "what does candidates page do",
            "what does candidate page do",
            "what does upload page do",
            "what does resume page do",
            "what does job page do",
            "what does dashboard do",
        ]
    )


def answer_page_help(question: str, ctx: AIContext) -> Optional[str]:
    if not is_page_help_question(question):
        return None

    current_page = normalize_page_name(ctx.page)
    target_page = detect_target_page(question, current_page)

    guide = PAGE_GUIDES.get(target_page)
    if not guide:
        return None

    q = simplify_text(question)

    asks_how = any(
        phrase in q
        for phrase in [
            "how to use",
            "how do i use",
            "how can i use",
            "where do i go",
            "which page",
        ]
    )

    if asks_how:
        return guide["how_to_use"]

    return f"{guide['features']} {guide['how_to_use']}"


def answer_general_ats(question: str, ctx: AIContext) -> Optional[str]:
    q = simplify_text(question)
    words = set(q.split())

    if "hi" in words or "hey" in words or "hello" in words:
        return (
            "Hi! I can help with upload, job descriptions, candidates, resume details, "
            "ranking, scores, skills, missing skills, deadlines, filters, export, delete, "
            "and how each ATS page works."
        )

    if "what can you do" in q or "who are you" in q or q == "help":
        return (
            "I am your ATS assistant. I can explain what each page does, tell you where to go "
            "for uploading resumes, creating jobs, viewing candidates, and opening resume details. "
            "I can also answer questions about candidate scores, matched skills, missing skills, "
            "resume summaries, saved jobs, deadlines, search, filters, export, and delete actions."
        )

    if any(word in q for word in ["upload", "submit"]) and any(
        word in q for word in ["resume", "cv", "file", "document"]
    ):
        return (
            "Go to the Upload Resume page, choose a PDF, DOC, or DOCX file, and upload it. "
            "The system stores the file, extracts the text, and uses it in candidates listing, "
            "resume details, ranking, and analysis."
        )

    if "how upload works" in q or "how does upload work" in q or "how does it work" in q:
        return (
            "After upload, the backend stores the file, extracts resume text, and saves the content "
            "so it can be used for resume viewing, skill extraction, ranking, and analysis."
        )

    if "job description" in q or q == "jd" or "add job" in q or "create job" in q:
        return (
            "Go to the Job Description page, enter the role title, paste the job description text, "
            "optionally add a deadline, and save it. Then you can use the Candidates page to rank resumes."
        )

    if "ranking" in q or ("rank" in q and "candidate" in q):
        return (
            "Candidate ranking happens on the Candidates page. Select a saved job and the system compares "
            "uploaded resumes against that job description to show score, matched skills, and missing skills."
        )

    if "score" in q and ("what" in q or "means" in q):
        return (
            "The score shows how well a resume matches the selected job description based on available ATS matching logic."
        )

    if "search" in q and "candidate" in q:
        return "Go to the Candidates page and use the search box to find candidates by name, email, or skills."

    if "filter" in q and "candidate" in q:
        return "Go to the Candidates page and use job filter and score filter to narrow the candidate list."

    if "export" in q or "csv" in q:
        return "On the Candidates page, use the Export CSV button to download candidate data."

    if "delete" in q and ("candidate" in q or "resume" in q):
        return "You can delete a resume or candidate entry from the Candidates page, and from the Resume page if the delete action is available."

    return None


def answer_from_resume(question: str, resume_text: str, ctx: AIContext) -> Optional[str]:
    q = simplify_text(question)
    email = extract_email(resume_text)
    phone = extract_phone(resume_text)
    skills = extract_skills_from_text(resume_text)
    summary = summarize_text(resume_text)
    exp = extract_experience_hint(resume_text)

    if "email" in q:
        return f"The candidate email is {email}." if email else "I could not find an email in the resume."

    if "phone" in q or "mobile" in q or "contact number" in q or "number" in q:
        return f"The candidate phone number is {phone}." if phone else "I could not find a phone number in the resume."

    if "skill" in q or "technology" in q or "tools" in q:
        if skills:
            return "Skills found in the resume: " + ", ".join(skills) + "."
        return "I could not clearly detect skills from the resume text."

    if "summary" in q or "summarize" in q or "about this candidate" in q or "about this resume" in q:
        if summary:
            return f"Resume summary: {summary}"
        return "I could not create a clear summary from the resume."

    if "experience" in q:
        return exp

    if "matched skill" in q or "matched skills" in q:
        matched = ctx.matched_skills or []
        if matched:
            return "Matched skills: " + ", ".join(matched) + "."
        return "I could not find matched skills in the current context."

    if "missing skill" in q or "missing skills" in q or "skill gap" in q:
        missing = ctx.missing_skills or []
        if missing:
            return "Missing skills: " + ", ".join(missing) + "."
        return "I could not find missing skills in the current context."

    if "score" in q:
        if ctx.score is not None:
            return f"The current candidate score is {ctx.score}."
        return "I could not find the candidate score in the current context."

    return None


def answer_from_jd(question: str, jd_text: str) -> Optional[str]:
    q = simplify_text(question)
    required_skills = extract_required_skills_from_jd(jd_text)
    summary = summarize_text(jd_text)

    if "summary" in q or "summarize" in q:
        if summary:
            return f"Job description summary: {summary}"
        return "I could not create a clear summary from the job description."

    if "required skill" in q or "skills required" in q or "what skills" in q:
        if required_skills:
            return "Skills found in the job description: " + ", ".join(required_skills) + "."
        return "I could not clearly detect required skills from the job description."

    return None


def answer_from_jobs(question: str, jobs: List[Dict[str, Any]]) -> Optional[str]:
    if not jobs:
        return None

    q = simplify_text(question)

    if "available jd" in q or "available job" in q or "saved jobs" in q or "which jobs" in q:
        titles = list_job_titles(jobs)
        if titles:
            return "Saved jobs are: " + ", ".join(titles) + "."
        return "I could not find saved job titles."

    if "deadline" in q or "deadlines" in q:
        parts = []
        for j in jobs:
            title = str(j.get("title") or f"Job {j.get('id')}").strip()
            deadline = j.get("application_deadline")
            if deadline:
                parts.append(f"{title}: {deadline}")
        if parts:
            return "Job deadlines: " + " | ".join(parts)
        return "I could not find any saved application deadlines."

    if "how many job" in q or "total job" in q:
        return f"There are {len(jobs)} saved jobs in the current list."

    return None


def build_candidate_summary(candidate: Dict[str, Any]) -> str:
    name = candidate.get("name") or candidate.get("candidate_name") or "This candidate"
    score = candidate.get("score", 0)
    email = candidate.get("email") or ""
    phone = candidate.get("phone") or ""
    experience = candidate.get("experience") or ""
    matched = candidate.get("matched_skills", []) or []
    missing = candidate.get("missing_skills", []) or []
    summary = candidate.get("summary") or ""

    parts = [f"{name} is in the current candidate list"]

    if score not in [None, ""]:
        parts[0] += f" with score {score}"

    parts[0] += "."

    if summary:
        parts.append(f"Summary: {summary}")

    contact_parts = []
    if email:
        contact_parts.append(f"Email: {email}")
    if phone:
        contact_parts.append(f"Phone: {phone}")
    if contact_parts:
        parts.append("Contact details: " + " | ".join(contact_parts) + ".")

    if experience:
        parts.append(f"Experience: {experience}.")

    if matched:
        parts.append("Matched skills: " + ", ".join(matched) + ".")

    if missing:
        parts.append("Missing or extra skill gap context: " + ", ".join(missing) + ".")

    return " ".join(parts)


def answer_from_candidates(question: str, candidates: List[Dict[str, Any]]) -> Optional[str]:
    if not candidates:
        return None

    q = simplify_text(question)

    sorted_candidates = sorted(
        candidates,
        key=lambda c: float(c.get("score", 0) or 0),
        reverse=True
    )

    if "top candidate" in q or "best candidate" in q:
        top = sorted_candidates[0]
        name = top.get("name") or top.get("candidate_name") or "Unknown Candidate"
        score = top.get("score", 0)
        return f"The top candidate is {name} with score {score}."

    if "top 3" in q or "best 3" in q:
        top3 = sorted_candidates[:3]
        parts = []
        for idx, c in enumerate(top3, start=1):
            name = c.get("name") or c.get("candidate_name") or f"Candidate {idx}"
            score = c.get("score", 0)
            parts.append(f"{idx}. {name} ({score})")
        return "Top 3 candidates: " + " | ".join(parts)

    if "how many candidate" in q or "total candidate" in q:
        return f"There are {len(candidates)} candidates in the current list."

    if "list candidates" in q or "show candidates" in q or "candidate names" in q:
        names = list_candidate_names(sorted_candidates)
        if names:
            return "Candidates in the current list include: " + ", ".join(names) + "."
        return "I could not find candidate names in the current list."

    target_name = detect_candidate_query_name(question)

    asks_contact = any(
        phrase in q
        for phrase in [
            "contact details", "contact detail", "contact info", "contact information",
            "email", "phone", "mobile", "number"
        ]
    )

    asks_summary = any(
        phrase in q
        for phrase in [
            "give info about", "tell me about", "who is", "show info about",
            "candidate info", "candidate information", "summary", "summarize"
        ]
    )

    if target_name:
        matched_candidate = find_candidate_by_name(candidates, target_name)
        if matched_candidate:
            name = matched_candidate.get("name") or matched_candidate.get("candidate_name") or target_name
            email = matched_candidate.get("email") or ""
            phone = matched_candidate.get("phone") or ""
            summary = matched_candidate.get("summary") or ""
            experience = matched_candidate.get("experience") or ""
            score = matched_candidate.get("score", 0)
            matched = matched_candidate.get("matched_skills", []) or []
            missing = matched_candidate.get("missing_skills", []) or []

            if asks_contact:
                contact_parts = []
                if email:
                    contact_parts.append(f"Email: {email}")
                if phone:
                    contact_parts.append(f"Phone: {phone}")

                if contact_parts:
                    return f"{name} contact details: " + " | ".join(contact_parts) + "."
                return f"I could not find contact details for {name} in the current list."

            if asks_summary or "candidate" in q:
                parts = [f"{name} is in the current candidate list with score {score}."]
                if summary:
                    parts.append(f"Summary: {summary}")
                if email or phone:
                    contact_parts = []
                    if email:
                        contact_parts.append(f"Email: {email}")
                    if phone:
                        contact_parts.append(f"Phone: {phone}")
                    parts.append("Contact details: " + " | ".join(contact_parts) + ".")
                if experience:
                    parts.append(f"Experience: {experience}.")
                if matched:
                    parts.append("Matched skills: " + ", ".join(matched) + ".")
                if missing:
                    parts.append("Missing or extra skill gap context: " + ", ".join(missing) + ".")
                return " ".join(parts)

    if q.startswith("tell me about ") or q.startswith("who is ") or q.startswith("show candidate "):
        raw_target = q
        raw_target = raw_target.replace("tell me about ", "")
        raw_target = raw_target.replace("who is ", "")
        raw_target = raw_target.replace("show candidate ", "")
        raw_target = raw_target.strip()

        if raw_target:
            matched_candidate = find_candidate_by_name(candidates, raw_target)
            if matched_candidate:
                return build_candidate_summary(matched_candidate)

            return f"I could not find a candidate named {raw_target} in the current list."

    if "compare " in q and " and " in q:
        compare_text = q.replace("compare ", "").strip()
        left, right = compare_text.split(" and ", 1)

        c1 = find_candidate_by_name(candidates, left.strip())
        c2 = find_candidate_by_name(candidates, right.strip())

        if c1 and c2:
            name1 = c1.get("name") or c1.get("candidate_name") or left.strip()
            name2 = c2.get("name") or c2.get("candidate_name") or right.strip()
            score1 = float(c1.get("score", 0) or 0)
            score2 = float(c2.get("score", 0) or 0)

            if score1 > score2:
                better = f"{name1} ranks higher than {name2}"
            elif score2 > score1:
                better = f"{name2} ranks higher than {name1}"
            else:
                better = f"{name1} and {name2} have the same score"

            return f"{name1}: {score1} | {name2}: {score2}. {better}."

        return "I could not compare those candidates because one or both names were not found in the current list."

    return None


def fallback_answer(ctx: AIContext) -> str:
    page = normalize_page_name(ctx.page)
    guide = PAGE_GUIDES.get(page)

    if guide:
        return (
            f"You are on the {guide['name']} page. {guide['features']} "
            f"{guide['how_to_use']} You can also ask about upload, jobs, candidate ranking, "
            "candidate summary, candidate contact details, resume summary, score, matched skills, "
            "missing skills, saved jobs, deadlines, search, filters, export, and delete."
        )

    return (
        "I could not find a clear answer from the available ATS context. "
        "Try asking about upload, jobs, deadlines, ranking, candidate info, contact details, score, email, phone, skills, summary, or top candidates."
    )


@router.post("/")
def ai_assist(payload: AIRequest):
    message = normalize_text(payload.message)
    ctx = payload.context or AIContext()

    if not message:
        return {"answer": "Please enter a question."}

    candidates_answer = answer_from_candidates(message, ctx.candidates or [])
    if candidates_answer:
        return {"answer": candidates_answer}

    jobs_answer = answer_from_jobs(message, ctx.jobs or [])
    if jobs_answer:
        return {"answer": jobs_answer}

    resume_text = normalize_text(ctx.resume_text)
    if resume_text:
        resume_answer = answer_from_resume(message, resume_text, ctx)
        if resume_answer:
            return {"answer": resume_answer}

    jd_text = normalize_text(ctx.jd_text)
    if jd_text:
        jd_answer = answer_from_jd(message, jd_text)
        if jd_answer:
            return {"answer": jd_answer}

    page_help = answer_page_help(message, ctx)
    if page_help:
        return {"answer": page_help}

    general_answer = answer_general_ats(message, ctx)
    if general_answer:
        return {"answer": general_answer}

    return {"answer": fallback_answer(ctx)}