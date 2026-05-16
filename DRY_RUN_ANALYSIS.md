# DRY RUN ANALYSIS - Document Formatter Project
## Comprehensive Bug & Error Report
**Date:** 2026-05-16  
**Status:** Critical Issues Found ⚠️

---

## 🔴 CRITICAL ISSUES

### 1. **Data Flow Mismatch: Classifier Output vs Expected Format**
**Location:** `server.ts` → `app.js`  
**Severity:** CRITICAL 🔴

**Problem:**
- **Backend (server.ts):** Uses Mammoth to extract text and classifies with AI/heuristics
  - Returns: `{ "text": "...", "label": "..." }` array
- **Frontend (app.js):** Expects data with structure like `{ "label": "...", "text": "..." }`
- **But Classifier.py returns:** `{ "type": "paragraph", "data": {...}, "label": "..." }`

**Data Structure Mismatch:**
```
server.ts returns:       { text: "Hello", label: "TITLE" }
app.js expects:          { text: "Hello", label: "TITLE" } ✓
classifier.py returns:   { type: "paragraph", data: {text: "..."}, label: "..." } ✗
```

**Impact:** The `renderMapper()` function tries to access `block.text` but classifier data has `element["data"]["text"]`

---

### 2. **Unused Python Files Not Called**
**Location:** Backend Architecture  
**Severity:** HIGH 🟠

**Issue:**
- `app/parser.py` - Parses .docx but never called from `server.ts`
- `app/classifier.py` - Classifies elements but never called
- `app/validator.py` - Validates documents but never called
- `app/contextualizer.py` - Optimizes layout but never called

**Current Flow:**
```
server.ts → mammoth.extractRawText() → AI Classification → JSON response
            (SKIPS all Python modules)
```

**What Should Happen:**
```
server.ts → app/parser.py → app/classifier.py → app/validator.py → JSON response
```

**Impact:** Python backend modules are dead code

---

### 3. **Missing Error Handling in server.ts**
**Location:** `/api/upload` endpoint  
**Severity:** HIGH 🟠

**Issues:**
- Line 276-278: `result.response.text()` can return unparseable JSON
- Line 278: No try-catch for `JSON.parse(responseText)`
- If AI returns invalid JSON, entire upload fails silently
- No validation that `classified` array is not empty

**Example Failure:**
```typescript
// AI might return:
"```json\n[{text: "title"}]\n```"  // Invalid JSON structure
// Parsing fails → frontend receives error
```

---

### 4. **dist/app/validator.py - Out of Sync**
**Location:** `dist/app/validator.py` vs `app/validator.py`  
**Severity:** MEDIUM 🟡

**Issue:**
- `dist/app/validator.py` still has old code (line 2): `paragraphs = classified_data["paragraphs"]`
- `app/validator.py` has fix but `dist/` is outdated
- Dist directory not being updated

---

### 5. **contextualizer.py - Unsafe AI Parsing**
**Location:** `app/contextualizer.py` line 45  
**Severity:** HIGH 🟠

**Issue:**
```python
# Line 45 - Can fail if AI returns non-integer or invalid format
new_order = [int(i) for i in new_order_str.split(',')]

# If AI returns: "0, 1, 3, 2, 4" (with spaces)
# int(" 1") will fail → ValueError
```

**Missing:** `.strip()` on each element

---

### 6. **classifier.py - Logic Bug in Pseudo-Table Detection**
**Location:** `app/classifier.py` line 83  
**Severity:** MEDIUM 🟡

**Issue:**
```python
# Line 83 - "abstract" must be EXACTLY in text AND length < 20
elif "abstract" in text_lower and len(text) < 20:
    label = LABEL_ABSTRACT

# Problem: "This is an abstract document" (28 chars) won't be classified as ABSTRACT
# Should be: `len(text) < 200` or use regex for ABSTRACT keyword
```

---

### 7. **parser.py - Missing Error Handling for Malformed DOCX**
**Location:** `app/parser.py` line 28-29  
**Severity:** MEDIUM 🟡

**Issue:**
```python
# Can crash if run.font.size is None
"font_size": run.font.size.pt if run.font.size else None,

# Better: Safe navigation pattern needed
```

---

### 8. **server.ts - Incomplete File Cleanup**
**Location:** `/api/upload` endpoint  
**Severity:** MEDIUM 🟡

**Issue:**
- Uploaded files in `uploads/` directory are never deleted
- Formatted output in `outputs/` persists forever
- Disk space leak over time

**Missing:**
```typescript
// After processing, delete tmp upload
fs.unlinkSync(file.path);
```

---

## 🟡 WARNINGS & EDGE CASES

### 9. **Empty Document Handling**
**Affected:** All modules  
**Issue:**
- No handling if DOCX file has 0 paragraphs
- Mammoth might return empty text
- `classified` array could be `[]`
- Frontend already has checks but backend doesn't

---

### 10. **AI Classification Timeout**
**Location:** `server.ts` line 276  
**Issue:**
- No timeout set for Gemini API calls
- Could hang indefinitely on slow network
- No circuit breaker pattern

---

### 11. **Font Size Edge Case**
**Location:** `app/parser.py` line 30  
**Issue:**
```python
"font_name": run.font.name
# Can be None for default fonts
# Should use: run.font.name or "Default"
```

---

## 📊 TEST CASES THAT WILL FAIL

| Test Case | Expected | Actual | Status |
|-----------|----------|--------|--------|
| Upload empty .docx | Show error | Blank array | ❌ FAIL |
| Upload with special chars | Classify correctly | JSON parse error | ❌ FAIL |
| Non-existent file | 404 error | Server crash | ❌ FAIL |
| Malformed JSON from AI | Fallback heuristics | TypeError | ❌ FAIL |
| 10MB+ file | Process or error | Possible timeout | ⚠️ RISK |
| Missing TITLE/ABSTRACT | Show warnings | Works (already fixed) | ✅ PASS |

---

## 🔧 RECOMMENDED FIXES (Priority Order)

### P0 - BLOCKING
1. **Fix data structure mismatch** between classifier output and frontend expectations
2. **Add JSON validation** after AI response in server.ts
3. **Sync dist/ directory** with app/ changes

### P1 - HIGH
4. Add safe integer parsing in `contextualizer.py` (line 45)
5. Improve "abstract" detection regex in `classifier.py`
6. Add file cleanup after processing

### P2 - MEDIUM
7. Better error messages for empty/invalid documents
8. Add timeout to Gemini API calls
9. Improve font handling in parser.py

---

## ✅ WHAT'S WORKING WELL

- Frontend error handling (app.js safety checks) ✓
- Validation panel showing issues ✓
- Fallback heuristics when AI fails ✓
- Publication rules system ✓
- User UI/UX flow ✓

---

## 🚀 VERDICT

**DO NOT DEPLOY YET** ⛔

The project has architectural issues that will cause failures in production:
1. **Data format incompatibility** - Core issue
2. **Dead Python code** - Unused backend modules
3. **Missing error handling** - JSON parsing failures
4. **Resource leaks** - Files never cleaned up

**Estimated Fix Time:** 2-3 hours
