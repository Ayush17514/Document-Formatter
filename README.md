<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Manuscript Formatter AI

Professional document formatting platform using AI to structure and style manuscripts according to publication-specific rules. Features Gemini-powered dynamic rule discovery, live HTML previews, and production-grade export options.

View your app in AI Studio: https://ai.studio/apps/3d4b2ca0-e19e-4991-b42b-19f32957207a

## Features

*   **AI-Powered Document Analysis:** Automatically classifies document elements like titles, authors, abstracts, headings, body text, references, tables, and images.
*   **Intelligent Layout Optimization:** Uses the Gemini API to intelligently reorder and structure document elements for a professional and readable layout.
*   **Dynamic Formatting Rules:** If a specific publication style is not in the local database, the application will query the Gemini API to resolve the formatting rules in real-time.
*   **Multiple Publication Styles:** Supports a wide range of publication styles, including IEEE, Nature, Science, and more.
*   **Multi-format Export:** Export your formatted manuscript to DOCX or LaTeX.
*   **Live HTML Preview:** See a live preview of your formatted document in your browser.

## How it Works

1.  **Upload:** Upload your manuscript in DOCX format.
2.  **Parse & Classify:** The application parses the document and uses AI to classify each element.
3.  **Optimize & Format:** The layout is optimized, and the document is formatted according to the selected publication style.
4.  **Download:** Download your professionally formatted manuscript.

## Tech Stack

*   **Backend:** Python, FastAPI
*   **Frontend:** Node.js, Express, React
*   **AI:** Google Gemini API

## Run Locally

**Prerequisites:**

*   Node.js
*   Python 3.10+

**Installation & Setup:**

1.  **Install Dependencies:**

    ```bash
    # Backend (Python)
    pip install -r requirements.txt

    # Frontend (Node.js)
    npm install
    ```

2.  **Set Environment Variables:**

    Create a `.env` file in the root directory and add your Gemini API key:

    ```
    GEMINI_API_KEY=YOUR_API_KEY
    ```

3.  **Run the Application:**

    ```bash
    # Run the backend server
    uvicorn app.main:app --reload

    # Run the frontend server
    npm run dev
    ```

## Deploy to Firebase

To deploy this application to Firebase Hosting, use the following command:

```bash
gemini classic-firebase-hosting-deploy
```
