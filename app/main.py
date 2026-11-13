import os
import json
import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.security import get_password_hash
from app.database.session import engine, Base, SessionLocal
from app.models import User, Project, Dataset, DatasetColumn, MLModel, BIDashboard, Report, ActivityLog
from app.analytics.profiler import profile_dataframe
from app.bi.engine import BIEngine
from app.api import api_router
import pandas as pd
import numpy as np

def seed_demo_data():
    """
    Creates tables and seeds default user and realistic business datasets for immediate interactive analysis.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Create or ensure Demo User
        demo_user = db.query(User).filter(User.email.in_(["demo@gmail.com", "demo@platform.ai"])).first()
        if not demo_user:
            demo_user = User(
                id=str(uuid.uuid4()),
                email="demo@gmail.com",
                hashed_password=get_password_hash("demo12345"),
                full_name="Admin",
                role="admin"
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
        elif demo_user.email != "demo@gmail.com":
            demo_user.email = "demo@gmail.com"
            db.commit()
            db.refresh(demo_user)

        # 2. Create Default Project
        proj = db.query(Project).filter(Project.user_id == demo_user.id).first()
        if not proj:
            proj = Project(
                id=str(uuid.uuid4()),
                user_id=demo_user.id,
                name="Enterprise Retail & Predictive Analytics",
                description="Cross-channel business performance, predictive forecasting, and customer retention"
            )
            db.add(proj)
            db.commit()
            db.refresh(proj)

        # 3. Create Sample Business Sales Dataset
        dataset_count = db.query(Dataset).filter(Dataset.user_id == demo_user.id).count()
        if dataset_count == 0:
            sample_sales_path = str(settings.UPLOAD_DIR / "enterprise_retail_sales.csv")
            
            # Generate realistic multi-variate business data
            dates = pd.date_range(start="2024-01-01", periods=120, freq="D")
            categories = ["Enterprise Software", "Cloud Infrastructure", "Hardware Systems", "Consulting Services", "Security Suite"]
            regions = ["North America", "EMEA", "APAC", "LATAM"]
            
            rows = []
            np.random.seed(42)
            for i in range(120):
                cat = np.random.choice(categories)
                reg = np.random.choice(regions)
                qty = np.random.randint(1, 15)
                base_price = {"Enterprise Software": 1200, "Cloud Infrastructure": 2500, "Hardware Systems": 3400, "Consulting Services": 1800, "Security Suite": 950}[cat]
                revenue = round(float(qty * base_price * np.random.uniform(0.85, 1.25)), 2)
                margin = np.random.uniform(0.25, 0.45)
                profit = round(float(revenue * margin), 2)
                discount = round(float(np.random.uniform(0.0, 0.2)), 2)
                satisfaction = round(float(np.random.uniform(3.5, 5.0)), 1)
                
                rows.append({
                    "Date": str(dates[i])[:10],
                    "Transaction_ID": f"TXN-{1000 + i}",
                    "Category": cat,
                    "Region": reg,
                    "Units_Sold": qty,
                    "Discount_Rate": discount,
                    "Revenue": revenue,
                    "Profit": profit,
                    "Customer_Satisfaction": satisfaction
                })
                
            sample_df = pd.DataFrame(rows)
            sample_df.to_csv(sample_sales_path, index=False)

            overall_summary, column_profiles = profile_dataframe(sample_df)

            ds = Dataset(
                id=str(uuid.uuid4()),
                project_id=proj.id,
                user_id=demo_user.id,
                name="Enterprise Retail Sales & Margins",
                original_filename="enterprise_retail_sales.csv",
                file_type="csv",
                file_path=sample_sales_path,
                row_count=len(sample_df),
                col_count=len(sample_df.columns),
                file_size_bytes=os.path.getsize(sample_sales_path),
                summary_json=json.dumps(overall_summary),
                is_cleaned=False
            )
            db.add(ds)
            db.commit()

            for c in column_profiles:
                col_rec = DatasetColumn(
                    dataset_id=ds.id,
                    name=c["name"],
                    data_type=c["data_type"],
                    raw_type=c["raw_type"],
                    null_count=c["null_count"],
                    unique_count=c["unique_count"],
                    sample_values_json=json.dumps(c["sample_values"]),
                    stats_json=json.dumps(c["stats"])
                )
                db.add(col_rec)

            # Auto-generate sample BI Dashboard
            default_bi = BIEngine.generate_default_dashboard(sample_df, "Executive Sales Overview")
            dashboard = BIDashboard(
                id=str(uuid.uuid4()),
                project_id=proj.id,
                dataset_id=ds.id,
                user_id=demo_user.id,
                name="Executive Sales Performance",
                description="Live executive dashboard tracking gross revenue, operating margin, and regional volume.",
                kpis_json=json.dumps(default_bi["kpis"]),
                charts_json=json.dumps(default_bi["charts"]),
                layout_json=json.dumps(default_bi["layout"])
            )
            db.add(dashboard)

            # Initial Activity Log
            act = ActivityLog(
                user_id=demo_user.id,
                action="upload",
                entity_type="dataset",
                entity_id=ds.id,
                details_json=json.dumps({
                    "name": ds.name,
                    "rows": ds.row_count,
                    "columns": ds.col_count
                })
            )
            db.add(act)
            db.commit()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB and seeds
    seed_demo_data()
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise-grade AI-Powered Predictive Intelligence Platform API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "platform": settings.PROJECT_NAME,
        "llm_provider": settings.LLM_PROVIDER
    }
