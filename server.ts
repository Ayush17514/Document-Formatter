import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import mammoth from "mammoth";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import crypto from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { GoogleGenAI } from "@google/genai";
import { Document, Packer, Paragraph, TextRun, AlignmentType, convertInchesToTwip } from "docx";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase client initialization (resilient with fallback)
const rawSupabaseUrl = process.env.SUPABASE_URL;
const rawSupabaseKey = process.env.SUPABASE_ANON_KEY;
const isSupabaseConfigured = Boolean(
  rawSupabaseUrl &&
  rawSupabaseKey &&
  !rawSupabaseUrl.includes("YOUR_SUPABASE_PROJECT") &&
  !rawSupabaseKey.includes("YOUR_SUPABASE_ANON_KEY")
);

const supabase = isSupabaseConfigured
  ? createClient(rawSupabaseUrl!, rawSupabaseKey!)
  : null;

// Lazy-loaded Gemini AI client using @google/genai
let genAIInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "AI_STUDIO_FALLBACK" || apiKey.trim() === "") {
      throw new Error("API_KEY_MISSING");
    }
    genAIInstance = new GoogleGenAI({ apiKey });
  }
  return genAIInstance;
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Directories
const STATIC_DIR = fs.existsSync(path.join(process.cwd(), "app/static"))
  ? path.join(process.cwd(), "app/static")
  : path.join(__dirname, "app/static");
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const OUTPUT_DIR = path.join(process.cwd(), "outputs");
const USERS_FILE = path.join(process.cwd(), "users.json");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const upload = multer({ dest: UPLOAD_DIR });

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use("/static", express.static(STATIC_DIR));

// Purge outputs older than N days to avoid disk buildup
function purgeOldOutputs(days = 7) {
  try {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(OUTPUT_DIR);
    files.forEach((f) => {
      try {
        const p = path.join(OUTPUT_DIR, f);
        const stat = fs.statSync(p);
        if (stat.mtimeMs < cutoff) fs.unlinkSync(p);
      } catch (e) { /* ignore */ }
    });
  } catch (e) { console.warn("Failed to purge old outputs:", e); }
}

// Helper: promise timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms = 20000): Promise<T> {
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI_TIMEOUT')), ms));
  return Promise.race([promise, timeout]);
}

// Helper: safely call Gemini generateContent with timeout and return text
async function generateWithTimeout(prompt: string, ms = 20000): Promise<string> {
  const ai = getGenAI();
  const generatePromise = ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  }).then(res => res.text || "");
  return withTimeout(generatePromise, ms);
}

// Helper: convert HTML to simple paragraph strings
function htmlToParagraphs(html: string): string[] {
  if (!html) return [];
  let t = html.replace(/<\/?p[^>]*>/gi, '\n');
  t = t.replace(/<[^>]+>/g, '');
  t = t.replace(/&nbsp;/g, ' ');
  return t.split('\n').map(s => s.trim()).filter(Boolean);
}

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

// --- User Database & Auth State ---

interface UserRecord {
  id?: string;
  name: string;
  email: string;
  password_hash: string;
  salt: string;
  totp_secret: string;
  created_at?: string;
}

const localUsers = new Map<string, UserRecord>();

// Seed local users from users.json if exists
function loadLocalUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      for (const [key, val] of Object.entries(parsed as any)) {
        const u = val as any;
        const cleanEmail = (u.email || key).toLowerCase().trim();
        localUsers.set(cleanEmail, {
          id: u.id || `user_${crypto.randomBytes(8).toString("hex")}`,
          name: u.name || "User",
          email: cleanEmail,
          password_hash: u.password_hash || u.passwordHash || "",
          salt: u.salt || "",
          totp_secret: u.totp_secret || u.totpSecret || "",
          created_at: u.created_at || u.joinedAt || new Date().toISOString(),
        });
      }
    }
  } catch (e) {
    console.warn("Failed to load local users.json:", e);
  }
}
loadLocalUsers();

function saveLocalUsers() {
  try {
    const obj: Record<string, any> = {};
    for (const [email, user] of localUsers.entries()) {
      obj[email] = {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.password_hash,
        salt: user.salt,
        totpSecret: user.totp_secret,
        joinedAt: user.created_at,
      };
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed to save users.json:", e);
  }
}

class UserDb {
  public static async getUser(email: string): Promise<UserRecord | null> {
    const cleanEmail = email.toLowerCase().trim();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', cleanEmail)
          .single();
        if (!error && data) {
          return {
            id: data.id,
            name: data.name,
            email: data.email,
            password_hash: data.password_hash || data.passwordHash,
            salt: data.salt,
            totp_secret: data.totp_secret || data.totpSecret,
            created_at: data.created_at || data.joinedAt,
          };
        }
      } catch (e) {
        // Fallback to local
      }
    }
    return localUsers.get(cleanEmail) || null;
  }

  public static async createUser(name: string, email: string, passwordHash: string, salt: string, totpSecret: string): Promise<UserRecord | null> {
    const cleanEmail = email.toLowerCase().trim();
    const newUser: UserRecord = {
      id: `user_${crypto.randomBytes(8).toString("hex")}`,
      name,
      email: cleanEmail,
      password_hash: passwordHash,
      salt,
      totp_secret: totpSecret,
      created_at: new Date().toISOString(),
    };

    localUsers.set(cleanEmail, newUser);
    saveLocalUsers();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .insert([{
            name: newUser.name,
            email: newUser.email,
            password_hash: newUser.password_hash,
            salt: newUser.salt,
            totp_secret: newUser.totp_secret,
          }])
          .select()
          .single();
        if (!error && data) {
          newUser.id = data.id || newUser.id;
        }
      } catch (e) {
        // Local user created successfully
      }
    }
    return newUser;
  }

  public static async updateUser(email: string, updates: Partial<UserRecord>): Promise<void> {
    const cleanEmail = email.toLowerCase().trim();
    const existing = localUsers.get(cleanEmail);
    if (existing) {
      Object.assign(existing, updates);
      localUsers.set(cleanEmail, existing);
      saveLocalUsers();
    }
    if (supabase) {
      try {
        await supabase
          .from('users')
          .update(updates)
          .eq('email', cleanEmail);
      } catch (e) {
        // Fallback
      }
    }
  }

  public static hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  }

  public static generateSalt(): string {
    return crypto.randomBytes(16).toString("hex");
  }
}

// In-memory documents history store with Supabase sync
interface DocumentItem {
  id: string;
  user_id: string;
  user_email: string;
  filename: string;
  publication_venue: string;
  document_type: string;
  status: string;
  docx_url: string | null;
  created_at: string;
}

const localDocuments: DocumentItem[] = [];

const pendingSignups = new Map<string, {
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  totpSecret: string;
  expiresAt: number;
}>();

// --- Auth Routes ---

app.post("/api/auth/signup/init", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ detail: "Missing required fields" });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (await UserDb.getUser(cleanEmail)) {
      return res.status(400).json({ detail: "Email already registered" });
    }

    // Generate TOTP Secret
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(cleanEmail, "ManuscriptAI", secret);

    // Generate QR Code data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    // Hash password now and hold in pending memory
    const salt = UserDb.generateSalt();
    const passwordHash = UserDb.hashPassword(password, salt);

    pendingSignups.set(cleanEmail, {
      name,
      email: cleanEmail,
      passwordHash,
      salt,
      totpSecret: secret,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes expiration
    });

    res.json({
      qrCode: qrCodeDataUrl,
      secret: secret
    });
  } catch (error: any) {
    console.error("Signup init error:", error);
    res.status(500).json({ detail: "Failed to initialize verification: " + error.message });
  }
});

app.post("/api/auth/signup/verify", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ detail: "Missing required fields" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const pending = pendingSignups.get(cleanEmail);

    if (!pending || pending.expiresAt < Date.now()) {
      pendingSignups.delete(cleanEmail);
      return res.status(400).json({ detail: "Signup session expired or not found. Please start over." });
    }

    // Verify TOTP token
    const isValid = authenticator.verify({ token: code, secret: pending.totpSecret });
    if (!isValid) {
      return res.status(400).json({ detail: "Invalid verification code. Please check Microsoft Authenticator." });
    }

    // Save user
    const user = await UserDb.createUser(
      pending.name,
      pending.email,
      pending.passwordHash,
      pending.salt,
      pending.totpSecret
    );
    if (!user) {
      return res.status(500).json({ detail: "Failed to create user in database." });
    }

    // Cleanup pending signup
    pendingSignups.delete(cleanEmail);

    const token = crypto.randomBytes(32).toString("hex");

    res.json({
      success: true,
      token,
      user: {
        name: user.name,
        email: user.email,
        joinedAt: user.created_at
      }
    });
  } catch (error: any) {
    console.error("Signup verify error:", error);
    res.status(500).json({ detail: "Verification failed: " + error.message });
  }
});

app.post("/api/auth/login/init", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ detail: "Missing required fields" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await UserDb.getUser(cleanEmail);
    if (!user) {
      return res.status(400).json({ detail: "Invalid email or password" });
    }

    const hash = UserDb.hashPassword(password, user.salt);
    if (hash !== user.password_hash) {
      return res.status(400).json({ detail: "Invalid email or password" });
    }

    res.json({
      mfaRequired: true,
      email: user.email
    });
  } catch (error: any) {
    console.error("Login init error:", error);
    res.status(500).json({ detail: "Authentication failed: " + error.message });
  }
});

app.post("/api/auth/login/verify", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ detail: "Missing required fields" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await UserDb.getUser(cleanEmail);
    if (!user) {
      return res.status(400).json({ detail: "Authentication session not found" });
    }

    // Verify TOTP token
    const isValid = authenticator.verify({ token: code, secret: user.totp_secret });
    if (!isValid) {
      return res.status(400).json({ detail: "Invalid MFA code. Please check Microsoft Authenticator." });
    }

    const token = crypto.randomBytes(32).toString("hex");

    res.json({
      success: true,
      token,
      user: {
        name: user.name,
        email: user.email,
        joinedAt: user.created_at
      }
    });
  } catch (error: any) {
    console.error("Login verify error:", error);
    res.status(500).json({ detail: "MFA verification failed: " + error.message });
  }
});

app.post("/api/auth/profile/update", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).json({ detail: "Missing required fields" });
    }
    const cleanEmail = email.toLowerCase().trim();
    const user = await UserDb.getUser(cleanEmail);
    if (!user) {
      return res.status(404).json({ detail: "User not found" });
    }
    await UserDb.updateUser(cleanEmail, { name });
    res.json({
      success: true,
      user: {
        name: name,
        email: user.email,
        joinedAt: user.created_at
      }
    });
  } catch (error: any) {
    res.status(500).json({ detail: "Failed to update profile: " + error.message });
  }
});

// --- Document & AI Formatting Routes ---

app.get("/api/options", (req, res) => {
  res.json(PUBLICATION_RULES);
});

app.post("/api/latex", async (req, res) => {
  try {
    const { classified, publication } = req.body;
    if (!Array.isArray(classified)) throw new Error("Invalid classified payload");
    const prompt = `Convert this manuscript structure into a professional LaTeX document compatible with ${publication}. \nReturn ONLY the raw .tex code. Content segments: ${JSON.stringify(classified.map((c: any) => ({ type: c.label, text: c.text })))} `;
    
    let text = await generateWithTimeout(prompt, 20000);
    // strip fences
    text = text.replace(/```latex|```/g, "").trim();
    res.json({ latex: text });
  } catch (e: any) {
    const errorMsg = e?.message || "";
    if (e.message === "API_KEY_MISSING" || errorMsg.includes("API key not valid") || errorMsg.includes("API_KEY_INVALID") || errorMsg === 'AI_TIMEOUT') {
      res.status(400).json({ error: "A valid Gemini API key is required for LaTeX generation or the request timed out. Please check your secrets." });
    } else {
      console.error('LaTeX generation error:', e);
      res.status(500).json({ error: "LaTeX Generation Failed" });
    }
  }
});

app.post("/api/upload", upload.single("file"), async (req: any, res) => {
  let filePath = null;
  try {
    const file = req.file;
    if (!file) throw new Error("No file uploaded");
    filePath = file.path;
    
    // Split into chunks based on paragraphs and structural elements
    const rawTextResult = await mammoth.extractRawText({ path: file.path }).catch(() => ({ value: "" }));
    const fullText = rawTextResult.value || "";
    const paragraphs = fullText.split("\n").map(t => t.trim()).filter(Boolean);

    // If mammoth path-based rawText is empty, try buffer-based extraction
    if (!paragraphs || paragraphs.length === 0) {
      try {
        const buf = fs.readFileSync(file.path);
        const rawBufferResult = await mammoth.extractRawText({ buffer: buf }).catch(() => ({ value: '' }));
        const fullBufferText = rawBufferResult.value || '';
        if (fullBufferText && fullBufferText.trim()) {
          paragraphs.push(...fullBufferText.split('\n').map(t => t.trim()).filter(Boolean));
        }
      } catch (e) { /* ignore */ }
    }

    // If still empty, try HTML fallback
    if (!paragraphs || paragraphs.length === 0) {
      const htmlFallback = (await mammoth.convertToHtml({ path: file.path }).catch(() => ({ value: "" }))).value || '';
      const extracted = htmlToParagraphs(htmlFallback);
      if (extracted && extracted.length) paragraphs.push(...extracted);
    }

    let classified: any = [];
    
    try {
      const prompt = `Analyze this manuscript text and classify each segment into one of these labels: \nTITLE, AUTHORS, ABSTRACT, HEADING1, HEADING2, BODY, REFERENCES, EQUATION, TABLE, FIGURE.\n\nRULES:\n- Return ONLY a JSON array of objects: { \"text\": \"...\", \"label\": \"...\" }.\n- Combine very short related lines if necessary.\n- Identify math equations even if they look like text.\n- Identify table headers and data.\n- Identify figure captions as FIGURE.\n\nManuscript segments:\n${JSON.stringify(paragraphs.slice(0, 80))}`;

      let responseText = await generateWithTimeout(prompt, 20000);
      responseText = responseText.replace(/```json|```/g, "").trim();
      try {
        const parsed = JSON.parse(responseText);
        if (Array.isArray(parsed)) classified = parsed;
        else throw new Error('AI returned non-array');
      } catch (e) {
        console.warn('AI returned invalid JSON classification, falling back to heuristics', e);
        classified = [];
      }
    } catch (aiErr) {
      console.warn("AI Classification failed or timed out, falling back to heuristics:", aiErr);
    }

    // Heuristic Fallback if classified empty
    if (!Array.isArray(classified) || classified.length === 0) {
      classified = paragraphs.map((t: string, i: number) => {
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

    // Normalize elements: ensure each item has text & label fields
    classified = classified.map((item: any) => {
      if (typeof item === 'string') return { text: item, label: 'BODY' };
      if (item && item.text && item.label) return { text: String(item.text), label: String(item.label) };
      if (item && item.data && item.data.text) return { text: String(item.data.text), label: item.label || 'BODY' };
      return { text: String(item?.text || ''), label: String(item?.label || 'BODY') };
    });

    if (!Array.isArray(classified) || classified.length === 0) {
      res.status(422).json({ detail: 'No paragraphs were extracted from the document' });
      return;
    }

    // Stats
    const label_distribution = classified.reduce((acc: any, p: any) => {
      acc[p.label] = (acc[p.label] || 0) + 1;
      return acc;
    }, {});

    // Clean older outputs asynchronously
    setImmediate(() => purgeOldOutputs(7));

    res.json({
      file_id: file.filename,
      validation_score: 95,
      paragraphs: classified,
      stats: { label_distribution },
      classified
    });
  } catch (error: any) {
    console.error('Upload processing error:', error);
    res.status(500).json({ detail: error.message });
  } finally {
    try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { console.warn('Failed to delete upload', e); }
  }
});

app.post("/api/process", async (req, res) => {
  try {
    const { file_id, doc_type, publication, fix_references, preview_only } = req.body;
    let { classified } = req.body;
    
    if (!Array.isArray(classified)) classified = [];

    // AI Reference Correction
    if (fix_references && !preview_only && Array.isArray(classified)) {
      try {
        const refBlocks = classified.filter((b: any) => b.label === "REFERENCES");
        if (refBlocks.length > 0) {
          const prompt = `Reformat these academic references strictly into the ${publication} style. \nKeep exactly the same number of items. Return ONLY a JSON array of strings.\nInput: ${JSON.stringify(refBlocks.map((b: any) => b.text))}`;
          
          let text = await generateWithTimeout(prompt, 20000);
          text = text.replace(/```json|```/g, "").trim();
          let corrected: any = [];
          try { corrected = JSON.parse(text); } catch (e) { console.warn('Reference correction returned invalid JSON', e); }
          
          if (Array.isArray(corrected) && corrected.length > 0) {
            let j = 0;
            classified = classified.map((b: any) => {
              if (b.label === "REFERENCES" && corrected[j]) return { ...b, text: corrected[j++] };
              return b;
            });
          }
        }
      } catch (e: any) {
        console.warn("Reference correction skipped or failed:", e?.message || e);
      }
    }

    // Step 1: Rule Resolution
    let rules = DEFAULT_RULES;
    if (PUBLICATION_RULES[doc_type]?.[publication]) {
      rules = PUBLICATION_RULES[doc_type][publication];
    } else {
      try {
        const prompt = `Return ONLY JSON for manuscript formatting rules (publication: ${publication}, type: ${doc_type}). \n  Required: font_family, font_size_body, font_size_heading, columns, line_spacing, margins (t,b,l,r), alignment (JUSTIFIED/LEFT).`;
        let text = await generateWithTimeout(prompt, 15000);
        rules = JSON.parse(text.replace(/```json|```/g, "").trim());
        if (!rules.alignment) rules.alignment = "JUSTIFIED";
      } catch (e) { console.warn('Dynamic rules resolution failed, using defaults', e); }
    }

    // Step 2: DOCX Generation
    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: "TITLE",
            name: "TITLE",
            basedOn: "Normal",
            next: "Normal"
          },
          {
            id: "AUTHORS",
            name: "AUTHORS",
            basedOn: "Normal",
            next: "Normal"
          },
          {
            id: "EQUATION",
            name: "EQUATION",
            basedOn: "Normal",
            next: "Normal"
          },
          {
            id: "FIGURE",
            name: "FIGURE",
            basedOn: "Normal",
            next: "Normal"
          }
        ]
      },
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
        children: (Array.isArray(classified) ? classified : []).map((p: any) => {
          let alignment: any = (rules.alignment === "JUSTIFIED") ? AlignmentType.JUSTIFIED : AlignmentType.LEFT;
          let fontSize = rules.font_size_body || 12;
          let bold = false;
          let italic = false;
          let text = (p && p.text) ? p.text : '';

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
            style: p.label,
            alignment: alignment,
            children: [new TextRun({ 
              text, 
              bold, 
              italics: italic,
              size: Math.max(1, Math.floor(fontSize)) * 2,
              font: rules.font_family ? { name: rules.font_family } : undefined
            })],
            spacing: { line: Math.round((rules.line_spacing || 1.15) * 240), after: 120 }
          });
        })
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    let downloadUrl = `/api/download/${file_id}`;
    let publicDocxUrl = null;

    // Step 3: Visual Preview Generation
    const htmlResult = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap: [
          "p[style-name='TITLE'] => p.ql-align-center:fresh",
          "p[style-name='AUTHORS'] => p.ql-align-center:fresh",
          "p[style-name='EQUATION'] => p.ql-align-center:fresh",
          "p[style-name='FIGURE'] => p.ql-align-center:fresh"
        ]
      }
    );

    if (!preview_only) {
      const outputFilename = `formatted_${file_id}.docx`;
      const outputPath = path.join(OUTPUT_DIR, outputFilename);
      fs.writeFileSync(outputPath, buffer);
      
      // Upload to Supabase Storage if configured
      if (supabase) {
        try {
          const { data: storageData, error: storageError } = await supabase.storage
            .from('outputs')
            .upload(outputFilename, buffer, {
              contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              upsert: true
            });
            
          if (!storageError && storageData) {
            const { data: publicUrlData } = supabase.storage.from('outputs').getPublicUrl(storageData.path);
            publicDocxUrl = publicUrlData.publicUrl;
          }
        } catch (e) {
          // Ignored
        }
      }

      // Save to database/history if user email is provided
      const { email } = req.body;
      if (email) {
        const cleanEmail = email.toLowerCase().trim();
        const user = await UserDb.getUser(cleanEmail);
        const recordId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        
        localDocuments.unshift({
          id: recordId,
          user_id: user?.id || `user_${cleanEmail}`,
          user_email: cleanEmail,
          filename: outputFilename,
          publication_venue: publication,
          document_type: doc_type,
          status: 'completed',
          docx_url: publicDocxUrl || downloadUrl,
          created_at: new Date().toISOString()
        });

        if (supabase && user && user.id) {
          try {
            await supabase.from('documents').insert([{
              user_id: user.id,
              filename: outputFilename,
              publication_venue: publication,
              document_type: doc_type,
              status: 'completed',
              docx_url: publicDocxUrl,
              html_url: null
            }]);
          } catch (e) {
            // Ignored
          }
        }
      }
    }

    setImmediate(() => purgeOldOutputs(7));

    res.json({
      status: "success",
      preview_html: htmlResult.value,
      rules,
      download_url: publicDocxUrl || downloadUrl
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

app.get("/api/history", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ detail: "Email required" });
    const cleanEmail = (email as string).toLowerCase().trim();
    const user = await UserDb.getUser(cleanEmail);

    if (supabase && user && user.id) {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return res.json(data);
        }
      } catch (e) {
        // Fall through to local history
      }
    }

    // Local in-memory history fallback
    const userDocs = localDocuments.filter(d => 
      d.user_email === cleanEmail || (user && user.id && d.user_id === user.id)
    );
    res.json(userDocs);
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

// Single-page fallback for frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(STATIC_DIR, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Professional Manuscript Engine running on http://localhost:${PORT}`);
});
