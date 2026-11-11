from app.database.session import SessionLocal
from app.models import User, Dataset
from app.schemas.user import UserLogin
from app.api.auth import login
from app.api.datasets import list_datasets, preview_dataset
from app.api.history import get_dashboard_summary

def test_api_login_endpoint():
    db = SessionLocal()
    try:
        req = UserLogin(email="demo@platform.ai", password="demo12345")
        res = login(req, db=db)
        assert "access_token" in res
        assert res["token_type"] == "bearer"
        assert res["user"].email == "demo@platform.ai"
    finally:
        db.close()

def test_api_datasets_and_preview_endpoints():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "demo@platform.ai").first()
        assert user is not None
        
        datasets = list_datasets(search="", project_id=None, db=db, current_user=user)
        assert len(datasets) >= 1
        
        sample_ds = datasets[0]
        preview = preview_dataset(sample_ds.id, limit=10, offset=0, db=db, current_user=user)
        assert "columns" in preview
        assert "rows" in preview
        assert len(preview["rows"]) == 10
    finally:
        db.close()

def test_api_dashboard_summary_endpoint():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "demo@platform.ai").first()
        stats = get_dashboard_summary(db=db, current_user=user)
        assert "kpis" in stats
        assert "total_datasets" in stats["kpis"]
        assert stats["kpis"]["total_datasets"] >= 1
        assert stats["kpis"]["total_records"] >= 100
        assert "recent_activity" in stats
    finally:
        db.close()
