import joblib
import numpy as np
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity

# ============================================================
# PATH SETUP
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_DIR = BASE_DIR / "models"

# ============================================================
# LOAD MODELS
# ============================================================

# AI text detection model (DICT: vectorizer + model)
ai_text_model = joblib.load(MODEL_DIR / "ai_text_linear_svm.joblib")

# Resume quality classifier (not used yet, kept for future)
resume_quality_model = joblib.load(
    MODEL_DIR / "dataset2_resume_classifier.joblib"
)

# Ridge model trained earlier (kept for reference / future)
resume_jd_match_model = joblib.load(
    MODEL_DIR / "ridge_model.joblib"
)

# ============================================================
# LOAD SHARED ATS VECTORIZER (CRITICAL)
# ============================================================

# This vectorizer MUST be used for BOTH resume and JD
resume_vectorizer = joblib.load(
    MODEL_DIR / "ats_tfidf_vectorizer.joblib"
)

# ============================================================
# LOAD METADATA
# ============================================================

artifact_metadata = joblib.load(
    MODEL_DIR / "artifact_metadata.joblib"
)

ats_metadata = joblib.load(
    MODEL_DIR / "ats_metadata.joblib"
)

print("ML artifacts loaded successfully")

# ============================================================
# AI-GENERATED TEXT / RESUME DETECTION
# ============================================================

def detect_ai_generated_text(text: str) -> dict:
    """
    Detect whether given text is AI-generated or human-written.
    Informational only. No hiring decision.
    """

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

    # LogisticRegression case
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)[0]
        human_prob = float(proba[0])
        ai_prob = float(proba[1])
    # LinearSVC case
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
# RESUME ↔ JOB DESCRIPTION MATCHING (FINAL)
# ============================================================

def compute_resume_jd_match(resume_text: str, jd_text: str) -> dict:
    """
    Compute resume–JD match using shared ATS TF-IDF vectorizer.
    Informational only. No auto-ranking.
    """

    if not resume_text or not jd_text:
        return {
            "match_score": None,
            "interpretation": "Insufficient data",
            "note": "Resume or JD text missing"
        }

    # IMPORTANT: SAME vectorizer for both
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
        "note": "Cosine similarity using shared ATS vectorizer. Informational only."
    }
# ============================================================
# BULK RESUME RANKING (TOP-N)
# ============================================================

def rank_resumes_against_jd(resume_texts: list, jd_text: str, top_n: int = 5):
    """
    Rank multiple resumes against a single JD.
    Returns top-N matches.
    """

    if not resume_texts or not jd_text:
        return []

    jd_vec = resume_vectorizer.transform([jd_text])

    results = []

    for idx, resume_text in enumerate(resume_texts):
        resume_vec = resume_vectorizer.transform([resume_text])
        score = float(cosine_similarity(resume_vec, jd_vec)[0][0])

        results.append({
            "resume_id": idx,
            "match_score": round(score, 3)
        })

    results = sorted(results, key=lambda x: x["match_score"], reverse=True)

    return results[:top_n]
# ============================================================
# FINAL ATS PIPELINE
# ============================================================

def ats_evaluate_resume(resume_text: str, jd_text: str) -> dict:
    """
    End-to-end ATS evaluation for a single resume.
    """

    ai_check = detect_ai_generated_text(resume_text)
    match_result = compute_resume_jd_match(resume_text, jd_text)

    return {
        "ai_detection": ai_check,
        "resume_jd_match": match_result,
        "final_note": "ATS decision support only. Human review required."
    }
