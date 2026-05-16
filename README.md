# 📄 Manuscript Formatter AI

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

**Professional AI-powered document formatting platform**  
*Convert raw manuscripts into publication-ready documents with intelligent formatting rules*

[![Built with FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Node.js Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Powered by Google Gemini](https://img.shields.io/badge/Powered%20by-Google%20Gemini-4285F4?style=flat-square)](https://ai.google.dev/)

[🚀 Live Demo](https://document-formatter-hxvx.onrender.com/) • [📖 Documentation](#documentation) • [🛠️ Installation](#installation--setup)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Problem & Solution](#problem--solution)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Installation & Setup](#installation--setup)
- [Usage Guide](#usage-guide)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## 🎯 Overview

**Manuscript Formatter AI** is a hybrid intelligent document processing platform that automatically converts unformatted `.docx` manuscripts into professionally formatted, publication-ready documents. It combines AI-powered document analysis with rule-based formatting to handle diverse manuscript types and publication styles.

### Key Problem Solved
Academics and researchers spend hours manually formatting manuscripts according to journal/conference requirements. This tool automates the entire process using:
- **AI document understanding** (Gemini API for content classification)
- **Rule-based formatting** (10+ major publication standards)
- **Dynamic rule discovery** (generates formatting rules for unknown publications)

---

## 🚀 Problem & Solution

### The Problem
- ❌ Inconsistent manuscript formatting across publications
- ❌ Manual reformatting is time-consuming and error-prone
- ❌ Each journal/conference has different style requirements
- ❌ Hard to maintain consistency with tables, figures, references
- ❌ No intelligent document structure understanding

### Our Solution
✅ **Automated intelligent formatting pipeline:**
1. Parse and extract document structure
2. AI-powered element classification (title, abstract, sections, references)
3. Intelligent layout optimization using Gemini AI
4. Publication-specific formatting rules applied
5. Multi-format export (DOCX, HTML, LaTeX)

---

## ✨ Key Features

### 1. **AI-Powered Document Analysis** 🤖
- Automatically classifies document elements:
  - Titles, Authors, Abstracts
  - Headings (H1, H2), Body text
  - References, Tables, Figures, Equations
- Uses Google Gemini API with heuristic fallback
- Handles complex document structures

### 2. **Intelligent Layout Optimization** 📐
- AI-driven element reordering for professional flow
- Optimal spacing and section organization
- Maintains logical document hierarchy
- Preserves semantic relationships between sections

### 3. **Dynamic Formatting Rules** ⚙️
- **30+ pre-configured publication styles:**
  - Research Papers: IEEE, Nature, Science, Cell Press, Elsevier, ACM
  - Conferences: IEEE Conference, ACM SIGGRAPH, NeurIPS, Springer LNCS
  - Books: Springer, Elsevier, Wiley-Blackwell
  - Reviews: Annual Reviews, Cochrane
- **Real-time rule generation** for unknown publications using Gemini
- Font family, size, margins, column layouts, spacing

### 4. **Multi-Format Export** 📤
- **DOCX** - Fully formatted Word document with styling
- **HTML** - Live preview and web-compatible output
- **LaTeX** - For technical/mathematical documents (AI-powered)

### 5. **Live HTML Preview** 👁️
- Real-time visual preview of formatted output
- See formatting applied instantly
- Interactive validation panel
- Document quality scoring

### 6. **Reference Style Correction** 📚
- AI-powered reference reformatting
- Automatic style conversion to publication standards
- Maintains reference count and integrity

### 7. **Comprehensive Validation** ✅
- Document completeness scoring (0-100)
- Missing section detection (Title, Abstract, References)
- Element distribution analysis
- Real-time feedback before processing

---

## 🔄 How It Works

```
┌───────────────────────────────────���─────────────────────────────┐
│                    MANUSCRIPT FORMATTER AI PIPELINE              │
└─────────────────────────────────────────────────────────────────┘

Step 1: UPLOAD
├── User uploads .docx manuscript
├── File validated (format check)
└── Stored in /uploads directory

Step 2: PARSING & CLASSIFICATION
├── Extract text and structure using Mammoth.js
├── Identify document elements via AI Gemini
│  ├── Heuristic fallback if AI unavailable
│  └── Classification confidence scoring
└── Return: Structured element array with labels

Step 3: VALIDATION
├── Check document completeness
├── Score based on presence of key sections
├── Identify missing components
└── Display quality metrics to user

Step 4: USER REVIEW & EDIT
├── Frontend displays extracted elements
├── User can review/edit classifications
├── Select publication style
├── Choose document type
└── Trigger processing

Step 5: RULE RESOLUTION
├── Load publication-specific rules
│  ├── Check local database (PUBLICATION_RULES)
│  └── If not found, query Gemini AI for rules
├── Apply margins, fonts, spacing settings
└── Generate formatting profile

Step 6: LAYOUT OPTIMIZATION (Optional)
├── Query Gemini AI for element reordering
├── Ensure logical flow and readability
├── Optimize section ordering
└── Return optimized element sequence

Step 7: FORMATTING & DOCUMENT GENERATION
├── Create new DOCX with applied rules
├── Format each element:
│  ├── TITLE: Centered, bold, heading font size
│  ├── ABSTRACT: Justified, emphasized
│  ├── HEADING: Bold, larger font
│  ├── BODY: Justified, specified font
│  └── REFERENCES: Smaller font, publication style
├── Apply margins, line spacing, column layout
└── Save to /outputs directory

Step 8: PREVIEW & DOWNLOAD
├── Convert DOCX to HTML via Mammoth
├── Display live preview to user
├── Return download link
└── User downloads formatted manuscript
```

---

## 🛠️ Tech Stack

### **Backend**
- **Framework:** FastAPI (Python) + Express.js (Node.js)
- **Document Processing:** 
  - `python-docx` - DOCX parsing and generation
  - `mammoth` - HTML conversion and extraction
  - `lxml` - XML parsing for advanced DOCX operations
- **AI Integration:** Google Generative AI (Gemini API)
- **Async:** Uvicorn (ASGI server), async/await patterns

### **Frontend**
- **Framework:** React (interactive UI)
- **Build Tool:** Vite (fast bundling and HMR)
- **Styling:** CSS3 with responsive design
- **HTTP Client:** Fetch API / Axios

### **AI & ML**
- **Language Model:** Google Gemini 1.5 Flash
- **Capabilities:**
  - Document content analysis and classification
  - Dynamic rule generation
  - Layout optimization suggestions
  - Reference formatting

### **Deployment**
- **Hosting:** Render.com (Python backend)
- **Containerization:** Docker-ready setup
- **Database:** In-memory file registry (dev), Redis/DB recommended for production

### **Language Composition**
- Python: 37.6% (backend logic, document processing)
- JavaScript: 24.2% (frontend utilities, Express server)
- HTML: 21.9% (UI templates and styling)
- TypeScript: 13.4% (Express server, type safety)
- CSS: 2.7% (responsive styling)
- Nix: 0.2% (dev environment)

---

## 🏗️ Project Architecture

### **Directory Structure**
```
Document-Formatter/
├── main.py                          # Legacy unified backend (reference)
├── server.ts                        # Express.js + TypeScript server
├── app/
│   ├── main.py                      # FastAPI application core
│   ├── parser.py                    # DOCX parsing & text extraction
│   ├── classifier.py                # Document element classification
│   ├── validator.py                 # Document validation & scoring
│   ├── formatter.py                 # DOCX formatting engine
│   ├── contextualizer.py            # AI-powered layout optimization
│   ├── ai_template_resolver.py      # Dynamic rule generation
│   ├── publication_rules.py         # 30+ publication style configs
│   ├── utils/
│   │   └── logger.py                # Logging configuration
│   └── static/
│       ├── index.html               # React frontend bundle
│       ├── app.js                   # React app logic
│       ├── styles.css               # UI styling
│       └── assets/                  # Images, icons
├── uploads/                         # Temporary uploaded files
├── outputs/                         # Processed DOCX files
├── requirements.txt                 # Python dependencies
├── package.json                     # Node.js dependencies
├── tsconfig.json                    # TypeScript configuration
├── vite.config.ts                   # Vite bundler config
└── .env.example                     # Environment template
```

### **Data Flow Architecture**

```
FRONTEND (React)
    ↓
    │ /api/upload (POST)
    ↓
BACKEND SERVER (Express/FastAPI)
    ├── Parse DOCX (Mammoth)
    ├── Classify Elements (Gemini AI)
    ├── Validate Document
    └── Return Structured Data
    ↓
    │ Display & Edit in UI
    ↓
    │ /api/process (POST with rules)
    ↓
    ├── Resolve Formatting Rules
    ├── Optimize Layout (AI)
    ├── Generate Formatted DOCX
    └── Convert to HTML Preview
    ↓
    │ /api/download/:file_id (GET)
    ↓
DOWNLOAD formatted_*.docx
```

---

## 📦 Installation & Setup

### **Prerequisites**
- **Node.js** ≥ 16.x
- **Python** ≥ 3.10
- **npm** or **yarn**
- **Git**

### **1. Clone the Repository**
```bash
git clone https://github.com/Ayush17514/Document-Formatter.git
cd Document-Formatter
```

### **2. Install Python Dependencies**
```bash
pip install -r requirements.txt
```

**Key Dependencies:**
- `fastapi==0.115.0` - Web framework
- `python-docx==1.1.2` - DOCX handling
- `mammoth==1.8.0` - HTML conversion
- `google-generativeai==0.8.3` - Gemini API
- `python-dotenv==1.1.1` - Environment config
- `lxml>=4.9.0` - XML processing
- `Pillow==11.1.0` - Image handling

### **3. Install Node Dependencies**
```bash
npm install
```

**Key Dependencies:**
- `express` - HTTP server
- `cors` - Cross-origin requests
- `multer` - File upload handling
- `mammoth` - Document conversion
- `docx` - DOCX generation
- `@google/generative-ai` - Gemini client

### **4. Configure Environment Variables**

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

### **5. Run the Application**

#### **Option A: Using Node.js + Express** (Recommended for development)
```bash
# Run the Express server with TypeScript
npm run dev
```

#### **Option B: Using Python + FastAPI**
```bash
# Run the FastAPI backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 3000

# In another terminal, start frontend dev server (if needed)
npm run dev
```

### **6. Access the Application**
```
http://localhost:3000/
```

---

## 📖 Usage Guide

### **Basic Workflow**

#### **Step 1: Prepare Your Manuscript**
- Ensure your document is in `.docx` format
- Include title, authors, abstract, and content
- Organize with clear sections and headings

#### **Step 2: Upload Document**
1. Click **"Choose File"** button
2. Select your `.docx` manuscript
3. Click **"Upload"**
4. Wait for parsing (10-30 seconds)

#### **Step 3: Review Classification**
- System displays detected document elements
- **Validation Score** shows document completeness
- Review element labels and content
- Edit if needed (click on elements to modify)

#### **Step 4: Configure Formatting**
- Select **Document Type** (Research Paper, Conference, etc.)
- Choose **Publication Style** (IEEE, Nature, ACM, etc.)
- Toggle **"Fix References"** if needed
- Review formatting rules preview

#### **Step 5: Process & Preview**
- Click **"Format & Preview"** button
- System applies formatting rules
- Live HTML preview displays
- AI layout optimization applied (optional)

#### **Step 6: Download Result**
- Click **"Download DOCX"** to save formatted manuscript
- File downloads as `formatted_[timestamp].docx`
- Open in Microsoft Word or compatible editor

### **Advanced Options**

#### **Custom Publication Style**
- Enter unknown publication name
- System queries Gemini AI to generate rules
- Customizable if defaults don't match

#### **LaTeX Export**
```bash
# Generate LaTeX version of formatted document
curl -X POST http://localhost:3000/api/latex \
  -H "Content-Type: application/json" \
  -d '{"classified": [...], "publication": "IEEE Access"}'
```

#### **Reference Correction**
- Enable "Fix References" checkbox
- AI reformats all references to publication style
- Maintains original reference information

---

## 🔌 API Endpoints

### **Upload & Parse Document**
```http
POST /api/upload
Content-Type: multipart/form-data

file: [DOCX binary]
```

**Response:**
```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "validation_score": 85,
  "stats": {
    "label_distribution": {
      "TITLE": 1,
      "ABSTRACT": 1,
      "BODY": 15,
      "REFERENCES": 1
    }
  },
  "classified": [
    {
      "text": "Manuscript Title Here",
      "label": "TITLE",
      "confidence": 0.95
    },
    ...
  ]
}
```

### **Process with Formatting Rules**
```http
POST /api/process
Content-Type: application/json

{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "doc_type": "Research Paper",
  "publication": "IEEE Access",
  "classified": [...element array...],
  "fix_references": true
}
```

**Response:**
```json
{
  "status": "success",
  "preview_html": "<html>...</html>",
  "rules": {
    "font_family": "Times New Roman",
    "font_size_body": 10,
    "columns": 2,
    "margins": {"top": 0.75, "bottom": 1.0, ...}
  },
  "download_url": "/api/download/550e8400-e29b-41d4-a716-446655440000"
}
```

### **Get Publication Rules**
```http
GET /api/options
```

**Response:**
```json
{
  "Research Paper": {
    "IEEE Access": {...},
    "Nature (Main)": {...},
    ...
  },
  "Conference Paper": {...},
  ...
}
```

### **Download Formatted Document**
```http
GET /api/download/:file_id
```

**Returns:** Binary DOCX file with `Content-Disposition: attachment`

### **Generate LaTeX**
```http
POST /api/latex
Content-Type: application/json

{
  "classified": [...element array...],
  "publication": "IEEE Access"
}
```

---

## ⚙️ Configuration

### **Publication Styles Configuration**

Edit `app/publication_rules.py` or `server.ts` to add custom publication styles:

```python
PUBLICATION_RULES = {
    "Research Paper": {
        "My Custom Journal": {
            "font_family": "Arial",
            "font_size_body": 11,
            "font_size_heading": 14,
            "columns": 1,
            "line_spacing": 1.5,
            "margins": {"top": 1.0, "bottom": 1.0, "left": 1.0, "right": 1.0},
            "alignment": "JUSTIFIED"
        }
    }
}
```

### **Document Type Categories**

| Category | Examples |
|----------|----------|
| Research Paper | IEEE, Nature, Science, Cell Press |
| Conference Paper | IEEE Conference, ACM SIGGRAPH, NeurIPS |
| Book Chapter | Springer, Elsevier, Wiley |
| Review Paper | Annual Reviews, Cochrane |

### **AI Model Configuration**

```env
# In .env file
GEMINI_MODEL=gemini-1.5-flash
GEMINI_TIMEOUT=20000  # ms
AI_TEMPERATURE=0.3    # Lower = more deterministic
```

---

## 🐛 Troubleshooting

### **Common Issues**

#### **Issue: "API_KEY_MISSING"**
```
Solution:
1. Verify GEMINI_API_KEY is set in .env
2. Check API key is valid (not placeholder)
3. Restart server after updating .env
```

#### **Issue: "File not found" after upload**
```
Solution:
1. Check /uploads directory exists
2. Verify multer configuration
3. Ensure sufficient disk space
4. Check file permissions
```

#### **Issue: Empty classification results**
```
Solution:
1. Verify document has content
2. Check if DOCX is corrupted
3. Try simpler document first
4. Enable debug logging
```

#### **Issue: Timeout on large files**
```
Solution:
1. Split document into smaller parts
2. Increase timeout: GEMINI_TIMEOUT=30000
3. Use simpler publication style (no AI rule generation)
4. Check network connection
```

#### **Issue: Formatting doesn't match expected style**
```
Solution:
1. Verify publication name spelling
2. Check publication_rules.py has entry
3. Try forcing AI rule generation
4. Compare with template document
```

### **Debug Mode**

Enable verbose logging:
```python
# In app/utils/logger.py
logging.basicConfig(level=logging.DEBUG)
```

---

## 🚀 Deployment

### **Deploy to Render.com** (Current Host)

1. **Fork this repository**
2. **Connect Render.com account** to GitHub
3. **Create new Web Service:**
   - Build Command: `npm install && pip install -r requirements.txt`
   - Start Command: `node server.ts` or `npm start`
   - Add environment variables in Settings
4. **Deploy** - Render handles the rest

### **Deploy to Docker**

```dockerfile
FROM node:18-alpine
FROM python:3.11-alpine

WORKDIR /app

COPY package*.json ./
COPY requirements.txt ./
RUN npm install && pip install -r requirements.txt

COPY . .

EXPOSE 3000

CMD ["node", "server.ts"]
```

```bash
docker build -t manuscript-formatter .
docker run -e GEMINI_API_KEY=your_key -p 3000:3000 manuscript-formatter
```

---

## 📚 API Documentation

### **Complete API Reference**

See [API Documentation](./docs/API.md) for detailed endpoint specifications, request/response examples, and error codes.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create feature branch:** `git checkout -b feature/amazing-feature`
3. **Commit changes:** `git commit -m 'Add amazing feature'`
4. **Push to branch:** `git push origin feature/amazing-feature`
5. **Open Pull Request**

### **Development Guidelines**
- Follow PEP 8 for Python
- Use ESLint for JavaScript/TypeScript
- Add tests for new features
- Update documentation
- Keep commits atomic and descriptive

---

## 📝 License

This project is open source and available under the MIT License.

---

## 🙏 Acknowledgments

- **Google Gemini API** - AI-powered document analysis
- **Mammoth.js** - DOCX parsing and conversion
- **python-docx** - Document generation
- **FastAPI & Express.js** - Web frameworks

---

## 📞 Support & Feedback

- **Issues:** [GitHub Issues](https://github.com/Ayush17514/Document-Formatter/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Ayush17514/Document-Formatter/discussions)
- **Email:** Contact via GitHub profile

---

## 🎓 Learn More

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Google Generative AI](https://ai.google.dev/)
- [DOCX Format Reference](https://python-docx.readthedocs.io/)
- [Express.js Guide](https://expressjs.com/)

---

<div align="center">

**Made with ❤️ by [Ayush17514](https://github.com/Ayush17514)**

⭐ Star us on GitHub if you find this helpful!

</div>
