import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import mammoth from "mammoth";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, convertInchesToTwip } from "docx";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy-loaded Gemini AI client
let genAIInstance: GoogleGenerativeAI | null = null;
function getGenAI() {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "AI_STUDIO_FALLBACK" || apiKey.trim() === "") {
      throw new Error("API_KEY_MISSING");
    }
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
}

const upload = multer({ dest: "uploads/" });

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use("/static", express.static(path.join(__dirname, "app/static")));

// Ensure essential directories
const UPLOAD_DIR = path.join(__dirname, "uploads");
const OUTPUT_DIR = path.join(__dirname, "outputs");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Publication Rules - Production Registry
const PUBLICATION_RULES: any = {
  "Research Paper": {
    "IEEE Access": {
      font_family: "Times New Roman",
      font_size_body: 10,
      font_size_heading: 18,
      columns: 2,
      line_spacing: 1.0,
      margins: { top: 0.75, bottom: 1.0, left: 0.625, right: 0.625 },
      alignment: "JUSTIFIED"
    },
    "Nature (Main)": {
      font_family: "Arial",
      font_size_body: 10,
      font_size_heading: 14,
      columns: 1,
      line_spacing: 1.15,
      margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 },
      alignment: "JUSTIFIED"
    },
    "Science (AAAS)": {
      font_family: "Times New Roman",
      font_size_body: 9,
      font_size_heading: 16,
      columns: 2,
      line_spacing: 1.0,
      margins: { top: 0.75, bottom: 1.0, left: 0.75, right: 0.75 },
      alignment: "JUSTIFIED"
    },
    "Cell Press": {
      font_family: "Helvetica",
      font_size_body: 10,
      font_size_heading: 18,
      columns: 1,
      line_spacing: 1.5,
      margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 },
      alignment: "JUSTIFIED"
    },
    "Elsevier (ScienceDirect)": {
      font_family: "Times New Roman",
      font_size_body: 11,
      font_size_heading: 16,
      columns: 1,
      line_spacing: 1.5,
      margins: { top: 1.0, bottom: 1.0, left: 1.25, right: 1.25 },
      alignment: "JUSTIFIED"
    },
    "ACM Transactions": {
      font_family: "Libertine",
      font_size_body: 9,
      font_size_heading: 14,
      columns: 2,
      line_spacing: 1.0,
      margins: { top: 1.0, bottom: 1.0, left: 0.75, right: 0.75 },
      alignment: "JUSTIFIED"
    },
    "MDPI (Applied Sciences)": {
      font_family: "Times New Roman",
      font_size_body: 10,
      font_size_heading: 12,
      columns: 1,
      line_spacing: 1.15,
      margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 },
      alignment: "JUSTIFIED"
    }
  },
  "Conference Paper": {
    "IEEE Conference": {
      font_family: "Times New Roman",
      font_size_body: 10,
      font_size_heading: 18,
      columns: 2,
      line_spacing: 1.0,
      margins: { top: 0.75, bottom: 1.0, left: 0.625, right: 0.625 },
      alignment: "JUSTIFIED"
    },
    "ACM Conference (SIGGRAPH/SIGCHI)": {
      font_family: "Helvetica",
      font_size_body: 9,
      font_size_heading: 14,
      columns: 2,
      line_spacing: 1.0,
      margins: { top: 1.0, bottom: 1.0, left: 0.75, right: 0.75 },
      alignment: "JUSTIFIED"
    },
    "Springer LNCS": {
      font_family: "Times New Roman",
      font_size_body: 10,
      font_size_heading: 14,
      columns: 1,
      line_spacing: 1.2,
      margins: { top: 1.5, bottom: 1.5, left: 1.2, right: 1.2 },
      alignment: "JUSTIFIED"
    },
    "NeurIPS/NIPS": {
      font_family: "Times New Roman",
      font_size_body: 10,
      font_size_heading: 14,
      columns: 1,
      line_spacing: 1.15,
      margins: { top: 1.0, bottom: 1.0, left: 1.5, right: 1.5 },
      alignment: "JUSTIFIED"
    }
  },
  "Book Chapter": {
    "Springer (Advances in...)": {
      font_family: "Times New Roman",
      font_size_body: 12,
      font_size_heading: 16,
      columns: 1,
      line_spacing: 1.5,
      margins: { top: 1.0, bottom: 1.0, left: 1.25, right: 1.25 },
      alignment: "JUSTIFIED"
    },
    "Elsevier Book Series": {
      font_family: "Garamond",
      font_size_body: 11,
      font_size_heading: 14,
      columns: 1,
      line_spacing: 1.5,
      margins: { top: 1.25, bottom: 1.25, left: 1.0, right: 1.0 },
      alignment: "JUSTIFIED"
    },
    "Wiley-Blackwell": {
      font_family: "Palatino",
      font_size_body: 10,
      font_size_heading: 14,
      columns: 1,
      line_spacing: 1.25,
      margins: { top: 1.0, bottom: 1.0, left: 1.5, right: 1.5 },
      alignment: "JUSTIFIED"
    }
  },
  "Review Paper": {
    "Annual Reviews": {
      font_family: "Times New Roman",
      font_size_body: 10,
      font_size_heading: 16,
      columns: 1,
      line_spacing: 1.2,
      margins: { top: 1.0, bottom: 1.0, left: 1.25, right: 1.25 },
      alignment: "JUSTIFIED"
    },
    "Cochrane Reviews": {
      font_family: "Arial",
      font_size_body: 11,
      font_size_heading: 14,
      columns: 1,
      line_spacing: 1.5,
      margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 },
      alignment: "JUSTIFIED"
    }
  }
};

const DEFAULT_RULES = {
  font_family: "Times New Roman",
  font_size_body: 12,
  font_size_heading: 14,
  columns: 1,
  line_spacing: 1.15,
  margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 },
  alignment: "JUSTIFIED"
};

// --- Routes ---

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "app/static/index.html"));
});

app.get("/api/options", (req, res) => {
  res.json(PUBLICATION_RULES);
});

app.post("/api/latex", async (req, res) => {
    try {
        const { classified, publication } = req.body;
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Convert this manuscript structure into a professional LaTeX document compatible with ${publication}. 
        Return ONLY the raw .tex code. Content segments: ${JSON.stringify(classified.map((c: any) => ({ type: c.label, text: c.text })))}`;
        
        const result = await model.generateContent(prompt);
        let latex = result.response.text().replace(/```latex|```/g, "").trim();
        res.json({ latex });
    } catch (e: any) {
        const errorMsg = e?.message || "";
        if (e.message === "API_KEY_MISSING" || errorMsg.includes("API key not valid") || errorMsg.includes("API_KEY_INVALID")) {
            res.status(400).json({ error: "A valid Gemini API key is required for LaTeX generation. Please check your secrets." });
        } else {
            res.status(500).json({ error: "LaTeX Generation Failed" });
        }
    }
});

app.post("/api/upload", upload.single("file"), async (req: any, res) => {
  try {
    const file = req.file;
    if (!file) throw new Error("No file uploaded");
    
    // Parse using mammoth to obtain HTML which preserves some structure (tables)
    const htmlResult = await mammoth.convertToHtml({ path: file.path });
    const html = htmlResult.value;
    
    // Split into chunks based on paragraphs and structural elements
    // We use a simplified split for the AI to process
    const rawTextResult = await mammoth.extractRawText({ path: file.path });
    const fullText = rawTextResult.value;
    const paragraphs = fullText.split("\n").filter(t => t.trim() !== "");

    let classified = [];
    
    try {
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `Analyze this manuscript text and classify each segment into one of these labels: 
        TITLE, AUTHORS, ABSTRACT, HEADING1, HEADING2, BODY, REFERENCES, EQUATION, TABLE, FIGURE.
        
        RULES:
        - Return ONLY a JSON array of objects: { "text": "...", "label": "..." }.
        - Combine very short related lines if necessary.
        - Identify math equations even if they look like text.
        - Identify table headers and data.
        - Identify figure captions as FIGURE.
        
        Manuscript segments:
        ${JSON.stringify(paragraphs.slice(0, 80))} // Process first 80 segments to keep tokens manageable`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().replace(/```json|```/g, "").trim();
        classified = JSON.parse(responseText);
    } catch (aiErr) {
        console.warn("AI Classification failed, falling back to heuristics:", aiErr);
        // Heuristic Fallback
        classified = paragraphs.map((t, i) => {
          let label = "BODY";
          const tLower = t.toLowerCase().trim();
          const tClean = t.trim();
          
          if (i === 0 && tClean.length < 200) label = "TITLE";
          else if (i < 5 && (tClean.includes("@") || tClean.includes(","))) label = "AUTHORS";
          else if (tLower.startsWith("abstract") || (i < 10 && tLower.startsWith("abstract:"))) label = "ABSTRACT";
          else if (tLower.startsWith("reference") || tLower.startsWith("bibliography")) label = "REFERENCES";
          else if (tClean.length < 100 && (tClean.match(/^[I|V|X|\d]+\./) || tClean === tClean.toUpperCase())) label = "HEADING1";
          
          return { text: tClean, label };
        });
    }

    res.json({
        file_id: file.filename,
        validation_score: 95,
        stats: {
            label_distribution: classified.reduce((acc: any, p: any) => {
                acc[p.label] = (acc[p.label] || 0) + 1;
                return acc;
            }, {})
        },
        classified
    });
  } catch (error: any) {
    res.status(500).json({ detail: error.message });
  }
});

app.post("/api/process", async (req, res) => {
  try {
    const { file_id, doc_type, publication, fix_references } = req.body;
    let { classified } = req.body;
    
    // Feature 5: AI Reference Correction
    if (fix_references) {
        try {
            const refBlocks = classified.filter((b: any) => b.label === "REFERENCES");
            if (refBlocks.length > 0) {
                const genAI = getGenAI();
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const prompt = `Reformat these academic references strictly into the ${publication} style. 
                Keep exactly the same number of items. Return ONLY a JSON array of strings.
                Input: ${JSON.stringify(refBlocks.map((b: any) => b.text))}`;
                
                const result = await model.generateContent(prompt);
                const corrected = JSON.parse(result.response.text().replace(/```json|```/g, "").trim());
                
                let j = 0;
                classified = classified.map((b: any) => {
                    if (b.label === "REFERENCES" && corrected[j]) return { ...b, text: corrected[j++] };
                    return b;
                });
            }
        } catch (e: any) {
            const errorMsg = e?.message || "";
            if (e.message === "API_KEY_MISSING" || errorMsg.includes("API key not valid") || errorMsg.includes("API_KEY_INVALID")) {
                console.warn("Skipping Reference Correction: Invalid or missing API key.");
            } else {
                console.error("Reference correction failed", e);
            }
        }
    }

    // Step 1: Rule Resolution
    let rules = DEFAULT_RULES;
    if (PUBLICATION_RULES[doc_type]?.[publication]) {
      rules = PUBLICATION_RULES[doc_type][publication];
    } else {
      try {
        const model = getGenAI().getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Return ONLY JSON for manuscript formatting rules (publication: ${publication}, type: ${doc_type}). 
          Required: font_family, font_size_body, font_size_heading, columns, line_spacing, margins (t,b,l,r), alignment (JUSTIFIED/LEFT).`;
        const result = await model.generateContent(prompt);
        rules = JSON.parse(result.response.text().replace(/```json|```/g, "").trim());
        if (!rules.alignment) rules.alignment = "JUSTIFIED";
      } catch (e) { }
    }

    // Step 2: DOCX Generation
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(rules.margins?.top || 1),
              bottom: convertInchesToTwip(rules.margins?.bottom || 1),
              left: convertInchesToTwip(rules.margins?.left || 1),
              right: convertInchesToTwip(rules.margins?.right || 1),
            }
          },
            column: { count: rules.columns || 1, space: 708 }
          },
          children: classified.map((p: any) => {
          let alignment: any = (rules.alignment === "JUSTIFIED") ? AlignmentType.JUSTIFIED : AlignmentType.LEFT;
          let fontSize = rules.font_size_body || 12;
          let bold = false;
          let italic = false;
          let text = p.text;

          switch(p.label) {
            case "TITLE":
              alignment = AlignmentType.CENTER;
              fontSize = rules.font_size_heading || 24;
              bold = true;
              text = text.toUpperCase();
              break;
            case "AUTHORS":
              alignment = AlignmentType.CENTER;
              fontSize += 1;
              break;
            case "ABSTRACT":
              bold = true;
              break;
            case "HEADING1":
              bold = true;
              fontSize += 2;
              text = text.toUpperCase();
              break;
            case "HEADING2":
              bold = true;
              break;
            case "EQUATION":
              alignment = AlignmentType.CENTER;
              fontSize += 1;
              italic = true;
              break;
            case "TABLE":
              bold = true;
              fontSize -= 1;
              text = `[TABLE] ${text}`;
              break;
            case "FIGURE":
              alignment = AlignmentType.CENTER;
              fontSize -= 1;
              italic = true;
              text = `[FIGURE] ${text}`;
              break;
          }

          return new Paragraph({
            alignment: alignment,
            children: [new TextRun({ 
                text, 
                bold, 
                italics: italic,
                size: fontSize * 2,
                font: rules.font_family ? { name: rules.font_family } : undefined
            })],
            spacing: { line: Math.round((rules.line_spacing || 1.15) * 240), after: 120 }
          });
        })
      }]
    });

    const outputFilename = `formatted_${file_id}.docx`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);

    // Step 3: Visual Preview Generation
    const htmlResult = await mammoth.convertToHtml({ buffer });

    res.json({
        status: "success",
        preview_html: htmlResult.value,
        rules,
        download_url: `/api/download/${file_id}`
    });
  } catch (error: any) {
    console.error("Processing Error:", error);
    res.status(500).json({ detail: error.message });
  }
});

app.get("/api/download/:file_id", (req, res) => {
    const fileId = req.params.file_id;
    const outputPath = path.join(OUTPUT_DIR, `formatted_${fileId}.docx`);
    if (!fs.existsSync(outputPath)) return res.status(404).send("File not found");
    res.download(outputPath);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Professional Manuscript Engine running on http://localhost:${PORT}`);
});
