# 📄 ManuscriptAI: Professional Academic Formatter

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

**Professional AI-powered document formatting platform**  
*Convert raw manuscripts into publication-ready documents with intelligent formatting rules*

[![Node.js Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Powered by Google Gemini](https://img.shields.io/badge/Powered%20by-Google%20Gemini-4285F4?style=flat-square)](https://ai.google.dev/)

[🚀 Live Demo](https://document-formatter-maf2.onrender.com/) • [📖 Documentation](#documentation) • [🛠️ Installation](#installation--setup)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Problem & Solution](#problem--solution)
- [Key Features](#key-features)
- [The 3-Stage Workflow](#the-3-stage-workflow)
- [Tech Stack](#tech-stack)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Project Architecture](#project-architecture)

---

## 🎯 Overview

**Manuscript Formatter AI** is an intelligent document processing platform that automatically converts unformatted `.docx` manuscripts into professionally formatted, publication-ready documents. It combines AI-powered document analysis with an intuitive 3-stage full-page manuscript processing workflow to handle diverse manuscript types and publication styles seamlessly.

### Key Problem Solved
Academics and researchers spend hours manually formatting manuscripts according to journal/conference requirements. This tool automates the entire process using:
- **AI document understanding** (Gemini API for content classification)
- **Rule-based formatting** (Major publication standards)
- **Dynamic rule discovery** (generates formatting rules for unknown publications)
- **Fluid Editor/Preview UI** (maximizes screen real estate for focused editing)

---

## 🚀 Problem & Solution

### The Problem
- ❌ Inconsistent manuscript formatting across publications
- ❌ Manual reformatting is time-consuming and error-prone
- ❌ Each journal/conference has different style requirements
- ❌ Hard to maintain consistency with references
- ❌ Cluttered workspaces and split screens that distract from the content

### Our Solution
✅ **Automated intelligent formatting pipeline:**
1. Parse and extract document structure using Mammoth
2. AI-powered element classification (title, abstract, sections, references) using Google Gemini
3. Apply publication-specific formatting rules
4. Fluid 3-stage user interface allowing for configuration, full-page preview, and full-page editing
5. Export to DOCX or HTML preview

---

## ✨ Key Features

### 1. **AI-Powered Document Analysis** 🤖
- Automatically classifies document elements: Titles, Authors, Abstracts, Headings (H1, H2), Body text, References
- Uses Google Gemini API with heuristic fallback

### 2. **Intuitive 3-Stage UI Architecture** 📐
- **Stage 1 (Configuration)**: Clean interface to upload manuscripts, set document types, publication venues, toggle AI reference auto-correction, and view validation warnings.
- **Stage 2 (Full-Page Preview)**: A clean, dedicated, full-page visual preview of the formatted document with export actions.
- **Stage 3 (Full-Page Editor)**: A standalone WYSIWYG editor simulating a real A4 page.

### 3. **Dynamic Formatting Rules** ⚙️
- **Pre-configured publication styles:** IEEE, Nature, Science, ACM, etc.
- **Real-time rule generation** for unknown publications using Gemini
- Applies font family, size, margins, and spacing automatically

### 4. **Export Capabilities** 📤
- **DOCX** - Fully formatted Word document with styling generated via `docx` npm library
- **LaTeX** - Generates and downloads the LaTeX source
- **HTML** - Live preview and web-compatible output

### 5. **Validation & Reference Correction** ✅
- Document completeness scoring and missing section detection
- AI-powered reference reformatting and style conversion

---

## 🔄 The 3-Stage Workflow

```text
┌─────────────────────────────────────────────────────────────────┐
│                    MANUSCRIPT FORMATTER AI PIPELINE             │
└─────────────────────────────────────────────────────────────────┘

Step 1: UPLOAD & CLASSIFICATION
├── User uploads .docx manuscript
├── Parse text with Mammoth.js
└── Identify document elements via Gemini AI

Step 2: STAGE 1 - CONFIGURATION & VALIDATION
├── Frontend displays extracted elements & validation warnings
├── User selects Document Type and Publication Style
└── User triggers "Format & Preview"

Step 3: STAGE 2 - FULL-PAGE PREVIEW
├── System applies formatting rules (Backend resolves rules & structure)
├── Generates optimized HTML preview of the formatted manuscript
└── User views a distraction-free full-page result

Step 4: STAGE 3 - FULL-PAGE EDITOR (Optional)
├── If edits are needed, user clicks "Edit Manuscript"
├── Launches dedicated Quill.js WYSIWYG editor
├── User makes content/layout adjustments
└── Clicks "Save & Preview" to return to Stage 2

Step 5: EXPORT
├── From Stage 2, user clicks "Export .docx" or "LaTeX"
├── Backend builds the finalized document
└── File is downloaded
```

---

## 🛠️ Tech Stack

### **Backend**
- **Framework:** Express.js + Node.js (via `tsx`)
- **Document Processing:** 
  - `mammoth` - DOCX to HTML conversion and extraction
  - `docx` - DOCX generation
- **AI Integration:** `@google/genai` & `@google/generative-ai` (Gemini API)
- **Language:** TypeScript (`server.ts`)

### **Frontend**
- **Core:** Vanilla JavaScript, HTML5
- **Styling:** Tailwind CSS (via CDN/Vite plugin)
- **Icons:** Lucide Icons
- **Editor:** Quill.js for WYSIWYG capabilities

### **AI & ML**
- **Language Model:** Google Gemini 1.5 Flash

---

## 📦 Installation & Setup

### **Prerequisites**
- **Node.js** ≥ 18.x
- **npm** or **yarn**
- **Git**

### **1. Clone the Repository**
```bash
git clone https://github.com/Ayush17514/Document-Formatter.git
cd Document-Formatter
```

### **2. Install Node Dependencies**
```bash
npm install
```

### **3. Configure Environment Variables**

Create a `.env` file in the project root:

```env
# Google Gemini API Configuration
GEMINI_API_KEY=your_actual_api_key_here

# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# File Paths
UPLOAD_DIR=./uploads
OUTPUT_DIR=./outputs
STATIC_DIR=./app/static
```

**Get your API key:**
1. Go to [Google AI Studio](https://ai.studio/)
2. Create a new API key
3. Copy and paste into `.env`

### **4. Run the Application**
```bash
# Run the Express server
npm run dev
```

### **5. Access the Application**
```
http://localhost:3000/
```

---

## ⚙️ Configuration

### Project Architecture
```text
Document-Formatter/
├── server.ts                        # Main Express.js server & API routes
├── package.json                     # Node.js dependencies & scripts
├── app/
│   └── static/
│       ├── index.html               # Frontend entry point
│       ├── app.js                   # Client-side logic & UI state
│       ├── style.css                # Custom styling over Tailwind
│       └── assets/                  # Images and static resources
├── uploads/                         # Temporary uploaded files
├── outputs/                         # Processed files
└── .env                             # Environment configuration
```

### Deployment Configuration
The application is designed to be easily deployable on platforms like Render or Heroku.
- The start command `npm start` runs the application via `tsx server.ts`.
- Ensure that the `.env` variables `GEMINI_API_KEY` and `PORT` are properly configured in your deployment platform's dashboard.
