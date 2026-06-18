# BQ Pulse - BigQuery Release Notes Dashboard

BQ Pulse is a premium, responsive dark-mode web application built with **Python Flask** and vanilla **HTML5, CSS3, and JavaScript**. It aggregates, parses, and visualizes the official Google BigQuery release notes stream, providing robust search/filter capabilities and an integrated sharing composer for X (formerly Twitter).

---

## 🌟 Features

*   **Smart RSS Parsing**: Parses Google's XML Atom feed and breaks up multi-part daily updates into structured, categorizable release logs.
*   **Dual-Layer Caching**: Saves feed data locally to avoid rate-limiting and speed up page load speeds, with a manual bypass force-refresh button.
*   **Reactive Filters**: Instantly slice feed logs by categories (*Feature*, *Announcement*, *Issue*, *Change*, *Breaking*) or search keywords.
*   **Aesthetic Dark UI**: Sleek glassmorphism dashboards designed with Outfit/JetBrains Mono typography, custom scrollbars, and neon glow backdrops.
*   **X Sharing Composer**: Select any release card to generate a tweet draft automatically.
    *   *Accurate Char Tracking*: Replaces actual URL lengths with X's default 23-character wrapper limit.
    *   *Auto-Shortener*: A helper button to dynamically prune text to fit standard 280-character boundaries without breaking links or tags.

---

## 📁 File Structure

```text
bq-releases-notes/
├── app.py                  # Flask application server, cache manager, and HTML/XML parsing logic
├── requirements.txt        # Backend dependencies (Flask, requests, beautifulsoup4)
├── run.ps1                 # Powershell setup and launch script
├── .gitignore              # Ignores bytecodes, local XML caches, venvs, and logs
├── templates/
│   └── index.html          # Dashboard structure, KPI widgets, and tweet sidebar
└── static/
    ├── css/
    │   └── style.css       # Layout grid, colors, glassmorphism card properties, and animations
    └── js/
        └── app.js          # Client-side state machine, filters, timelines, and Twitter composer
```

---

## ⚙️ Quick Start

### Option A: Automatic Launch (Windows PowerShell)

Run the included helper script to initialize the virtual environment, install dependencies, and launch the server:

```powershell
.\run.ps1
```

---

### Option B: Manual Setup

1.  **Clone / Navigate to the project directory**:
    ```bash
    cd bq-releases-notes
    ```

2.  **Create a virtual environment**:
    ```bash
    python -m venv venv
    ```

3.  **Activate the environment**:
    *   *Windows*:
        ```powershell
        .\venv\Scripts\activate
        ```
    *   *macOS/Linux*:
        ```bash
        source venv/bin/activate
        ```

4.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

5.  **Start the server**:
    ```bash
    python app.py
    ```

6.  **Open in Browser**:
    Go to **[http://127.0.0.1:5000](http://127.0.0.1:5000)** to explore the release stream.
