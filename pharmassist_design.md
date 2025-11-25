# PharmAssist App -- Design Document

## 1. Overview

PharmAssist is an offline‑first medical assistance tool for pharmacies
and doctors. It provides medication guidance based on symptoms using
**user‑provided medical resources** (books, PDFs, notes, datasets) and
optionally **Google AI (Gemini through user's own account)**.\
Medication results always have **two sections**: 1. **User Resource
Results (Primary)** 2. **Optional: Google AI Results (Secondary)**\
User-provided sources always take priority over generics, and generics
always take priority over branded medicines.

Each patient session is stored in a **local database** on the device.

------------------------------------------------------------------------

## 2. Core Principles

-   Offline-first design.
-   User controls all medical reference data.
-   Symptom → AI reasoning → medication list with summarized
    explanation.
-   Prioritization:
    1.  User resources\
    2.  Generic medications\
    3.  Branded medications\
-   Two-section output.
-   All results must include a **medical disclaimer**.

------------------------------------------------------------------------

## 3. Modules

### 3.1 User Resource Library

Stores: - Uploaded PDFs (converted to text) - Text files, notes -
Manually added medical definitions - Drug reference tables (generic vs
branded)

Provides: - Chunking + embedding + semantic search (local) - Local
vector DB for medical lookup - Fast retrieval for symptoms & conditions

### 3.2 Session Manager (Local DB)

Stores: - Each patient session\
- Symptoms entered\
- AI reasoning output\
- Final medication recommendation summary\
- Timestamp\
- Optional doctor notes

### 3.3 Symptom Interpreter

-   Takes symptoms\
-   Creates structured symptom profile\
-   Runs local medical search\
-   Merges with optional Gemini remote response

### 3.4 Medication Reasoning Engine

Steps: 1. Query local resource library\
2. Extract symptom → condition → medication paths\
3. Rank: - User resource match strength\
- Then generics\
- Then branded\
4. Produce final 2‑section output\
5. Produce summary + disclaimer

### 3.5 Optional Cloud AI (Gemini)

-   User signs in with their own Google account
-   Only used if user enables
-   Used to enhance:
    -   Reasoning\
    -   Summaries\
    -   Extra suggestions

------------------------------------------------------------------------

## 4. Workflows

### 4.1 Add Medical Resources

1.  User uploads PDF/text\
2.  App extracts text\
3.  Chunks document (300--600 tokens per chunk)\
4.  Embeds and stores in vector DB\
5.  Marks document as searchable

### 4.2 Patient Session Flow

1.  New session → enter symptoms\
2.  Local search retrieves relevant chunks\
3.  Local reasoning engine identifies:
    -   Possible conditions\
    -   Generic medications\
    -   Branded alternatives\
4.  System generates:
    -   **Section 1:** User Resource Output\
    -   **Section 2:** (Optional) Google AI Output\
5.  Doctor can add notes\
6.  Session saved locally

### 4.3 Search in Resources

-   Search by condition\
-   Search by medicine\
-   Search by symptom name\
-   Purely local and offline

------------------------------------------------------------------------

## 5. Screens

### 5.1 Home

-   New Patient Session\
-   Patient History\
-   Manage Medical Resources\
-   Settings (Google AI toggle)

### 5.2 Symptom Entry Screen

-   Symptoms textbox\
-   Option: Detailed fields (duration, severity)\
-   Button: "Generate Recommendations"

### 5.3 Results Screen

**Section 1 -- User Resources (Primary)**\
- Conditions likely\
- Recommended generics\
- Branded equivalents\
- Text explanation\
- Disclaimer

**Section 2 -- Google AI (Optional)**\
- Additional reasoning\
- Alternate medication suggestions\
- Caution notes

### 5.4 Patient History

-   List of previous sessions\
-   Search and filter\
-   Open session → view summary

### 5.5 Resource Management Screen

-   Upload new PDF\
-   List of uploaded data\
-   Delete resource\
-   Reprocess resource

------------------------------------------------------------------------

## 6. Data Models

### 6.1 Resource

    id  
    title  
    type (pdf/text/dataset)  
    raw_text  
    chunks[]  
    embeddings[]  
    created_at  

### 6.2 PatientSession

    id  
    symptoms  
    local_reasoning_output  
    google_ai_output (optional)  
    final_summary  
    created_at  

### 6.3 Medication Item

    name  
    type (generic/branded)  
    source (user/google)  
    confidence_score  
    description  

------------------------------------------------------------------------

## 7. Local Vector Search Design

-   Embedding model: locally-run small LLM embedding model\
-   Vector DB: sqlite + sqlite-vss OR Chroma local mode\
-   Retrieval method:
    -   Top-k = 10\
    -   Re-rank via symptom similarity

------------------------------------------------------------------------

## 8. Disclaimer Template (Mandatory)

"PharmAssist is not a substitute for professional medical judgment. All
medication decisions must be made by a licensed medical practitioner
based on the patient's full clinical evaluation."

------------------------------------------------------------------------

## 9. UI/UX Guidelines

-   Minimal clinical interface\
-   Prioritize fast input/output\
-   Two-section results must be visually separated\
-   Dark mode mandatory\
-   All important clinical info should be big and readable

------------------------------------------------------------------------

## 10. Platform Notes

Works for: - Windows app (Electron + Flutter Windows + Tauri)\
- Web app (PWA + local DB + offline vector search)
