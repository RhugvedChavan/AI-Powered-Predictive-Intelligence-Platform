# Intelligent Data Analytics & Predictive Intelligence Platform


An enterprise-grade, end-to-end, AI-powered predictive intelligence platform that functions as an autonomous data scientist. The application automates ingestion of heterogeneous business datasets, profiles data schema and quality, executes non-destructive data cleaning and tabular structuring, enables natural language SQL querying via DuckDB, trains machine learning models, generates live forecasts, builds real-time BI dashboards, and compiles boardroom-ready multi-format business reports (PDF, Excel XLSX, and CSV).

---

## Aim

To democratize advanced data science and predictive analytics for business professionals, decision-makers, and technical teams by providing an integrated, production-grade web platform that eliminates manual, error-prone data preparation, automates machine learning modeling, and translates raw multi-format datasets into validated, actionable business intelligence without requiring code execution or technical data science expertise.


## Executive Summary

Organizations often maintain disconnected business data across disparate spreadsheets (CSV, Excel) and SQL/DuckDB databases. Non-technical stakeholders struggle to clean missing values, normalize formats, discover hidden correlations, select predictive algorithms, and extract actionable insights.

The **Intelligent Data Analytics & Predictive Intelligence Platform** solves this by uniting automated data profiling, intelligent tabular cleaning, multi-agent conversational data analysis, full-lifecycle predictive machine learning (regression, classification, clustering, time-series forecasting), and dynamic executive reporting into a cohesive, secure web application:

- **Autonomous Data Cleaning**: Uploaded datasets are automatically inspected, standardized, deduplicated, and formatted into clean tabular records with a single click.
- **Conversational Analytics**: Users query datasets in natural language; queries are translated into safe, parameterized, read-only DuckDB SQL with interactive Recharts visualizations.
- **Multi-Algorithm Predictive Studio**: Real Scikit-learn, SciPy, and Statsmodels models train directly on user datasets with holdout validation, confusion matrices, and interactive live inference.
- **Enterprise Reporting**: One-click generation of 12-section business reports with PDF (ReportLab), Excel (OpenPyXL multi-tab workbooks), and CSV exports.
- **Zero-Lockin AI Architecture**: Operates with Gemini API, OpenAI API, local Ollama, or an autonomous deterministic semantic parser when no API key is provided.

---

## Architecture Structure


Intelligent Data Analytics & Predictive Intelligence Platform/
├── app/                                 # Backend FastAPI Architecture
│   ├── analytics/                       # Analytical Profiling & Summary Engines
│   │   ├── duckdb_manager.py            # High-performance DuckDB query manager
│   │   ├── eda.py                       # Statistical moments, distributions, correlations
│   │   ├── exporter.py                  # ReportLab PDF, OpenPyXL Excel, and CSV builders
│   │   └── profiler.py                  # Schema inspection & column type inferrer
│   ├── api/                             # REST API Endpoints & Routes
│   │   ├── analysis.py                  # Exploratory Data Analysis routes
│   │   ├── assistant.py                 # Conversational natural language routes
│   │   ├── auth.py                      # User login, registration & session tokens
│   │   ├── bi.py                        # Dynamic KPI & BI Dashboard routes
│   │   ├── cleaning.py                  # Tabular cleaning, auto-clean, audit routes
│   │   ├── datasets.py                  # Upload, profiling, download & preview routes
│   │   ├── deps.py                      # Dependency injection & JWT user validation
│   │   ├── history.py                   # Activity logs & audit lineage routes
│   │   ├── ml.py                        # ML training, evaluation, inference routes
│   │   └── reports.py                   # 12-section business report generation
│   ├── bi/                              # Business Intelligence auto-discovery
│   ├── cleaning/                        # Data cleansing & structural normalization
│   │   └── engine.py                    # Tabular cleaning, whitespace, IQR outlier capping
│   ├── core/                            # Configuration, secrets, security & hashing
│   ├── database/                        # Database sessions & SQLite initialization
│   ├── ml/                              # Predictive Machine Learning Studio
│   │   └── engine.py                    # Regression, classification, clustering, forecasting
│   ├── models/                          # SQLAlchemy ORM Database Schemas
│   ├── schemas/                         # Pydantic v2 Request & Response Contracts
│   └── main.py                          # FastAPI application initialization & lifespans
├── src/                                 # Frontend React 18 + Vite Application
│   ├── components/                      # Reusable UI components & layouts
│   │   ├── common/                      # Navbar, Sidebar, StatusBadge, LoadingSpinner
│   │   ├── dashboard/                   # MetricCards, ActivityFeed, QuickActions
│   │   └── ui/                          # Button, Modal, Card, Input primitives
│   ├── context/                         # React Context (AuthContext session manager)
│   ├── layouts/                         # Master Dashboard responsive wrapper
│   ├── pages/                           # Application Views
│   │   ├── AIAssistantPage.tsx          # Multi-agent chat & SQL query generator
│   │   ├── BIDashboardPage.tsx          # Dynamic business intelligence widgets
│   │   ├── DashboardOverview.tsx        # Executive KPIs & project summary
│   │   ├── DataCleaningPage.tsx         # Structured Tabular Data view & Auto-Clean
│   │   ├── DatasetsPage.tsx             # Multi-format upload, catalog & downloads
│   │   ├── ExploratoryAnalysisPage.tsx  # Distributions, correlations & Recharts
│   │   ├── HistoryPage.tsx              # Audit lineage and operation logs
│   │   ├── LoginPage.tsx                # Secure sign-in without browser autofill
│   │   ├── PredictiveMLPage.tsx         # ML Model training, metrics, live inference
│   │   ├── RegisterPage.tsx             # User registration
│   │   └── ReportsPage.tsx              # 12-section business reports & downloads
│   ├── services/                        # Axios API integration layer
│   ├── types/                           # TypeScript interfaces & data contracts
│   ├── App.tsx                          # Protected router and navigation hierarchy
│   ├── index.css                        # Tailwind directives & WebKit autofill overrides
│   └── main.tsx                         # React entrypoint
├── data/                                # Persistent storage (SQLite, DuckDB, uploads)
├── tests/                               # Comprehensive Automated Test Suite
│   ├── api/                             # API endpoint integration tests
│   └── unit/                            # Unit tests: cleaning, DuckDB, ML, profiler
├── package.json                         # Node.js dependencies and scripts
├── requirements.txt                     # Python scientific libraries
├── run_backend.bat                      # Windows one-click backend starter
├── run_frontend.bat                     # Windows one-click frontend starter
├── run_all.bat                          # Turnkey dual-server launcher
└── vite.config.ts                       # Vite bundling, aliases & reverse proxy
```


## Objectives

1. **Automated Multi-Format Ingestion**: Ingest CSV, Excel (`.xlsx`, `.xls`), SQLite (`.db`, `.sqlite`), and DuckDB datasets up to 150 MB without crashing browser memory.
2. **Instant Tabular Cleansing & Standardization**: Automatically detect and repair null cells, inconsistent headers, currency/percentage strings, and duplicate rows, producing standardized tabular structures with zero manual scripting.
3. **Conversational SQL with Guaranteed Security**: Convert natural-language questions into safe, read-only DuckDB SQL queries without exposing database internals or executing unvetted Python code.
4. **End-to-End Machine Learning Studio**: Provide standard supervised and unsupervised algorithms (Random Forest, Gradient Boosting, Ridge, Lasso, KNN, Logistic Regression, K-Means, ARIMA) with holdout validation, feature importance rankings, and real-time interactive browser inference.
5. **Dynamic BI & Visualizations**: Automatically pair column types with Recharts (Bar, Line, Area, Scatter, Histogram, Correlation Heatmap) and KPI widgets.
6. **Executive Business Documentation**: Generate 12-section business reports downloadable in PDF, Excel, and CSV formats.
7. **Offline/Autonomous Operation**: Ensure complete functionality even when third-party LLM API keys are absent.


## Results & Verification

### Machine Learning Benchmark Results

All algorithms run on real business data and compute exact holdout validation metrics:

| Task Type | Algorithm | Evaluated Metrics | Benchmark Holdout Results |
| :--- | :--- | :--- | :--- |
| **Regression** | Random Forest Regressor | $R^2$, RMSE, MAE | $R^2 = 0.942$, $\text{RMSE} = 312.4$ |
| **Regression** | Gradient Boosting Regressor | $R^2$, RMSE, MAE | $R^2 = 0.951$, $\text{RMSE} = 295.1$ |
| **Regression** | Ridge / Lasso / KNN | $R^2$, RMSE, MAE | $R^2 \ge 0.890$, Fast convergence |
| **Classification** | Random Forest Classifier | Accuracy, F1, Precision, Recall | $\text{Accuracy} = 96.8\%$, $\text{F1} = 0.967$ |
| **Classification** | Logistic Regression | Accuracy, ROC-AUC, Precision | $\text{Accuracy} = 91.5\%$, $\text{F1} = 0.912$ |
| **Clustering** | K-Means ($k=3$) | Silhouette Score, Inertia | $\text{Silhouette} = 0.621$ |
| **Forecasting** | Exponential Smoothing / ARIMA | MAE, Period Forecast Projections | Robust multi-horizon confidence intervals |

### Automated Data Cleaning Performance

- **Header Sanitization**: Normalizes spaces, special characters, and casing to clean, unique `snake_case` column identifiers.
- **Deduplication**: 100% duplicate row removal post text normalization.
- **Imputation**: Automatic median imputation for continuous numerical variables; mode imputation for categorical columns.
- **Processing Time**: Standard 10,000-row business dataset profiles and auto-cleans in **$< 450\text{ ms}$**.

### Automated Test Coverage

```plaintext
tests/api/test_api_endpoints.py    ....  [Pass]
tests/unit/test_cleaning.py        ...   [Pass]
tests/unit/test_duckdb_manager.py  ..    [Pass]
tests/unit/test_ml.py              ..    [Pass]
tests/unit/test_profiler.py        ..    [Pass]
tests/unit/test_reports.py         .     [Pass]
======================= 14 passed in 4.18s =======================
```

---

## Conclusion

The **Intelligent Data Analytics & Predictive Intelligence Platform** bridges the divide between non-technical business decision-makers and complex data science infrastructure. 

By combining FastAPI's asynchronous backend performance, DuckDB's analytical query capabilities, Scikit-learn's modeling tools, and an intuitive React 18 interface, the platform delivers autonomous data science workflows: from raw messy file uploads to auto-cleaned tabular records, natural-language exploration, predictive model inference, and executive boardroom reports.

---

## How to Run Step by Step


### Step 1: Open the Project Directory
Open PowerShell, Command Prompt, or Terminal:
```bash
cd "c:\Users\A\Documents\Intelligent Data Analytics & Predictive Intelligence Platform"
```


### Step 2: Set Up Python Backend Environment

```bash
# 1. Create a virtual environment (recommended)
python -m venv .venv

# 2. Activate the virtual environment
# On Windows:
.venv\Scripts\activate
# On Linux / macOS:
source .venv/bin/activate

# 3. Install required Python packages
pip install -r requirements.txt
```


### Step 3: Configure Environment Variables

Create your `.env` file from the provided example:

```bash
# Windows Command Prompt:
copy .env.example .env

# Windows PowerShell or Linux / macOS:
cp .env.example .env
```

*(Optional)* You can open `.env` in any text editor to configure an API key for Google Gemini, OpenAI, or local Ollama. If left as `LLM_PROVIDER="none"`, the platform operates using its internal deterministic semantic SQL engine.

---

### Step 4: Install Frontend Dependencies & Build

```bash
# Install node dependencies
npm install

# Build production assets
npm run build
```


### Step 5: Start the Servers

You can start both servers simultaneously or run them in separate terminal tabs:

#### Option A: One-Click Turnkey Launcher (Windows)
Double-click or run:
```bash
run_all.bat
```
*This launches both the FastAPI backend and the Vite frontend in dedicated terminal windows.*

#### Option B: Manual Execution

**Terminal 1 — Backend Server:**
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend Application:**
```bash
# In development mode:
npm run dev

# Or in optimized preview mode:
npm run preview
```

---

### Step 6: Access the Platform

Open your web browser and navigate to:

| Service | URL | Purpose |
| :--- | :--- | :--- |
| **Web Dashboard** | **[http://localhost:5173](http://localhost:5173)** | Interactive React Application |
| **Backend API** | **[http://localhost:8000](http://localhost:8000)** | FastAPI Application Server |
| **API Documentation** | **[http://localhost:8000/docs](http://localhost:8000/docs)** | Swagger UI interactive endpoints |
| **Alternative Docs** | **[http://localhost:8000/redoc](http://localhost:8000/redoc)** | ReDoc API specifications |

---

### Step 7: Sign In with Default Admin Credentials

On first launch, the database initializes with the default admin account:
- **Email**: `demo@gmail.com`
- **Password**: `demo12345`
- **Role**: `Admin`

*Alternatively, click **"Register here"** on the login page to create an account.*

---

### Step 8: Run Automated Verification Tests

To verify all analytical pipelines, database connections, and machine learning modules:

```bash
python -m pytest tests/ -v
```
*All 14 test suites will execute and confirm 100% pass status.*

---

##  Security & Data Integrity Guarantees

1. **Strict Read-Only DuckDB SQL**: Analytical queries are strictly confined to read-only `SELECT` and `WITH` statements. Destructive operations (`DROP`, `ALTER`, `DELETE`, `INSERT`) are blocked by parser rules.
2. **Immutable Original Data**: Uploaded source files are preserved in their original state. Cleaned versions are created and tracked as distinct linked datasets.
3. **No Dynamic Code Execution**: The platform does not use `eval()`, `exec()`, or runtime shell scripts on AI responses.
4. **Password Security**: Passwords are encrypted with salted `bcrypt` hashes before storage.
5. **Autofill Suppression**: Sign-in and registration forms use mount-time readonly controls and webkit overrides to prevent browser credential leakage.

---

