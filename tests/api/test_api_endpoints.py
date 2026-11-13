from app.database.session import SessionLocal
from app.models import User, Dataset
from app.schemas.user import UserLogin
from app.api.auth import login
from app.api.datasets import list_datasets, preview_dataset, download_dataset
from app.api.cleaning import auto_clean_dataset
from app.schemas.cleaning import AutoCleanRequest
from app.api.history import get_dashboard_summary

def test_api_login_endpoint():
    db = SessionLocal()
    try:
        req = UserLogin(email="demo@gmail.com", password="demo12345")
        res = login(req, db=db)
        assert "access_token" in res
        assert res["token_type"] == "bearer"
        assert res["user"].email == "demo@gmail.com"
    finally:
        db.close()

def test_api_datasets_and_preview_endpoints():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "demo@gmail.com").first()
        assert user is not None
        
        datasets = list_datasets(search="", project_id=None, db=db, current_user=user)
        assert len(datasets) >= 1
        
        sample_ds = datasets[0]
        ds_id = sample_ds["id"] if isinstance(sample_ds, dict) else sample_ds.id
        preview = preview_dataset(ds_id, limit=10, offset=0, db=db, current_user=user)
        assert "columns" in preview
        assert "rows" in preview
        assert len(preview["rows"]) == 10
    finally:
        db.close()

def test_api_dashboard_summary_endpoint():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "demo@gmail.com").first()
        stats = get_dashboard_summary(db=db, current_user=user)
        assert "kpis" in stats
        assert "total_datasets" in stats["kpis"]
        assert stats["kpis"]["total_datasets"] >= 1
        assert stats["kpis"]["total_records"] >= 100
        assert "recent_activity" in stats
    finally:
        db.close()

def test_api_download_and_autoclean_endpoints():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "demo@gmail.com").first()
        datasets = list_datasets(search="", project_id=None, db=db, current_user=user)
        assert len(datasets) >= 1
        ds_id = datasets[0]["id"]
        
        # Test CSV download response
        csv_resp = download_dataset(ds_id, format="csv", db=db, current_user=user)
        assert csv_resp.media_type == "text/csv"
        
        # Test XLSX download response
        xlsx_resp = download_dataset(ds_id, format="xlsx", db=db, current_user=user)
        assert "spreadsheetml" in xlsx_resp.media_type
        
        # Test auto clean endpoint
        clean_req = AutoCleanRequest(dataset_id=ds_id, new_dataset_name="Test Cleaned Dataset")
        clean_res = auto_clean_dataset(clean_req, db=db, current_user=user)
        assert clean_res["status"] == "applied"
        assert clean_res["cleaned_dataset_id"] is not None
        assert "after_stats" in clean_res
    finally:
        db.close()

