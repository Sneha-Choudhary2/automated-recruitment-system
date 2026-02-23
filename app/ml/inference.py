import joblib
import numpy as np
import re
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer

# ============================================================
# PATH SETUP
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_DIR = BASE_DIR / "models"

# ============================================================
# LOAD MODELS
# ============================================================

ai_text_model = joblib.load(MODEL_DIR / "ai_text_linear_svm.joblib")

resume_quality_model = joblib.load(
    MODEL_DIR / "dataset2_resume_classifier.joblib"
)

resume_jd_match_model = joblib.load(
    MODEL_DIR / "ridge_model.joblib"
)

resume_vectorizer = joblib.load(
    MODEL_DIR / "ats_tfidf_vectorizer.joblib"
)

artifact_metadata = joblib.load(
    MODEL_DIR / "artifact_metadata.joblib"
)

ats_metadata = joblib.load(
    MODEL_DIR / "ats_metadata.joblib"
)

print("ML artifacts loaded successfully")


# ============================================================
# AI TEXT DETECTION
# ============================================================

def detect_ai_generated_text(text: str) -> dict:

    if not text or not text.strip():
        return {
            "label": "unknown",
            "ai_probability": None,
            "human_probability": None,
            "note": "Empty or invalid text"
        }

    vectorizer = ai_text_model["vectorizer"]
    model = ai_text_model["model"]

    X = vectorizer.transform([text])

    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)[0]
        human_prob = float(proba[0])
        ai_prob = float(proba[1])
    else:
        score = model.decision_function(X)[0]
        ai_prob = float(1 / (1 + np.exp(-score)))
        human_prob = 1 - ai_prob

    label = "AI-generated" if ai_prob >= 0.5 else "Human-written"

    return {
        "label": label,
        "ai_probability": round(ai_prob, 3),
        "human_probability": round(human_prob, 3),
        "note": "Probabilistic ML signal. Not a hiring decision."
    }


# ============================================================
# BASIC TEXT UTILITIES
# ============================================================

def extract_years(text: str):
    matches = re.findall(r"(\d+)\+?\s*(?:years|yrs)", text.lower())
    if matches:
        return max(int(y) for y in matches)
    return 0


def extract_skills(text: str):
    common_skills = [
        "python", "machine learning", "sql",
        "deep learning", "nlp", "pandas",
        "numpy", "tensorflow", "scikit",
        "data analysis", "power bi", "tableau"
    ]

    text_lower = text.lower()
    return [skill for skill in common_skills if skill in text_lower]


# ============================================================
# SINGLE RESUME ↔ JD MATCH (TF-IDF COSINE)
# ============================================================

def compute_resume_jd_match(resume_text: str, jd_text: str):

    if not resume_text or not jd_text:
        return {
            "match_score": None,
            "interpretation": "Insufficient data",
            "note": "Resume or JD text missing"
        }

    resume_vec = resume_vectorizer.transform([resume_text])
    jd_vec = resume_vectorizer.transform([jd_text])

    score = float(cosine_similarity(resume_vec, jd_vec)[0][0])

    if score >= 0.75:
        interp = "Strong match"
    elif score >= 0.5:
        interp = "Moderate match"
    else:
        interp = "Weak match"

    return {
        "match_score": round(score, 3),
        "interpretation": interp,
        "note": "Cosine similarity using shared ATS vectorizer."
    }


# ============================================================
# HYBRID ATS RANKING (UPGRADED)
# ============================================================

def rank_resumes_against_jd(resume_texts: list, jd_text: str, top_n: int = 5):

    if not resume_texts or not jd_text:
        return []

    # 1️⃣ Semantic similarity (fresh vectorizer for dynamic corpus)
    corpus = [jd_text] + resume_texts
    vectorizer = TfidfVectorizer(stop_words="english")
    vectors = vectorizer.fit_transform(corpus)

    jd_vec = vectors[0]
    resume_vecs = vectors[1:]

    similarities = cosine_similarity(jd_vec, resume_vecs)[0]

    # 2️⃣ JD requirements
    jd_skills = extract_skills(jd_text)
    jd_years = extract_years(jd_text)

    results = []

    for idx, resume_text in enumerate(resume_texts):

        similarity_score = float(similarities[idx])

        # Skill Match
        resume_skills = extract_skills(resume_text)

        if jd_skills:
            skill_overlap = len(set(resume_skills) & set(jd_skills))
            skill_match_score = skill_overlap / len(jd_skills)
        else:
            skill_match_score = 0

        # Experience Match
        resume_years = extract_years(resume_text)

        if jd_years > 0:
            experience_match_score = min(resume_years / jd_years, 1)
        else:
            experience_match_score = 0

        # Final Weighted Score
        final_score = (
            0.6 * similarity_score +
            0.25 * skill_match_score +
            0.15 * experience_match_score
        )

        results.append({
            "resume_id": idx,
            "match_score": round(final_score, 3)
        })

    results.sort(key=lambda x: x["match_score"], reverse=True)

    return results[:top_n]


# ============================================================
# FULL ATS PIPELINE (SINGLE RESUME)
# ============================================================

def ats_evaluate_resume(resume_text: str, jd_text: str):

    ai_check = detect_ai_generated_text(resume_text)
    match_result = compute_resume_jd_match(resume_text, jd_text)

    return {
        "ai_detection": ai_check,
        "resume_jd_match": match_result,
        "final_note": "ATS decision support only. Human review required."
    }
