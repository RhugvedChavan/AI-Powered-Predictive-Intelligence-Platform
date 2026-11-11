import os
import pandas as pd
from app.reports.generator import ReportGenerator

def test_report_content_and_exports(tmp_path):
    df = pd.DataFrame({
        "Date": pd.date_range("2023-01-01", periods=10, freq="D"),
        "Sales": [120, 150, 180, 200, 220, 210, 240, 260, 290, 310],
        "Category": ["Electronics", "Electronics", "Furniture", "Furniture", "Electronics", "Clothing", "Clothing", "Furniture", "Electronics", "Electronics"]
    })
    
    sections = ReportGenerator.compile_report_sections(
        df=df,
        dataset_name="Quarterly Retail Performance",
        ml_model_summary={"best_model": "RandomForestRegressor", "r2": 0.92}
    )
    
    assert "1_executive_summary" in sections
    assert "12_actionable_recommendations" in sections
    assert len(sections["12_actionable_recommendations"]) >= 1
    
    # Test CSV export
    csv_path = str(tmp_path / "test_report.csv")
    ReportGenerator.generate_csv(sections, csv_path, df)
    assert os.path.exists(csv_path)
    assert os.path.getsize(csv_path) > 50
    
    # Test Excel export
    xlsx_path = str(tmp_path / "test_report.xlsx")
    ReportGenerator.generate_excel(sections, xlsx_path, df)
    assert os.path.exists(xlsx_path)
    assert os.path.getsize(xlsx_path) > 500
    
    # Test PDF export
    pdf_path = str(tmp_path / "test_report.pdf")
    ReportGenerator.generate_pdf(sections, pdf_path)
    assert os.path.exists(pdf_path)
    assert os.path.getsize(pdf_path) > 1000
