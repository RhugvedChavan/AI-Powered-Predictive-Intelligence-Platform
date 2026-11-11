import re
import numpy as np
import pandas as pd
from typing import Any

class BIEngine:
    """
    Business Intelligence Engine that discovers domain-relevant KPIs,
    calculates metrics from actual data, and builds dashboard configurations.
    """

    @classmethod
    def discover_kpis(cls, df: pd.DataFrame) -> list[dict[str, Any]]:
        """
        Dynamically discovers and calculates business KPIs based on column semantics.
        """
        kpis = []
        cols = list(df.columns)
        total_records = len(df)
        
        # 1. Total Records / Activity Volume KPI
        kpis.append({
            "id": "kpi_total_records",
            "title": "Total Records",
            "column": None,
            "aggregation": "count",
            "value": total_records,
            "format": "number",
            "subtitle": "Total observations analyzed"
        })
        
        num_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c])]
        
        # 2. Revenue / Sales / Monetary KPI
        sales_matches = [c for c in num_cols if any(k in c.lower() for k in ["sale", "revenue", "price", "amount", "total", "cost"])]
        if sales_matches:
            sales_col = sales_matches[0]
            total_val = float(df[sales_col].sum())
            avg_val = float(df[sales_col].mean())
            kpis.append({
                "id": f"kpi_total_{sales_col}",
                "title": f"Total {sales_col.title()}",
                "column": sales_col,
                "aggregation": "sum",
                "value": round(total_val, 2),
                "format": "currency",
                "subtitle": f"Cumulative {sales_col.lower()}"
            })
            kpis.append({
                "id": f"kpi_avg_{sales_col}",
                "title": f"Average {sales_col.title()}",
                "column": sales_col,
                "aggregation": "avg",
                "value": round(avg_val, 2),
                "format": "currency",
                "subtitle": f"Per-record average {sales_col.lower()}"
            })
            
        # 3. Profit / Margin KPI
        profit_matches = [c for c in num_cols if any(k in c.lower() for k in ["profit", "margin", "gain", "net"])]
        if profit_matches:
            prof_col = profit_matches[0]
            total_prof = float(df[prof_col].sum())
            kpis.append({
                "id": f"kpi_total_{prof_col}",
                "title": f"Total {prof_col.title()}",
                "column": prof_col,
                "aggregation": "sum",
                "value": round(total_prof, 2),
                "format": "currency",
                "subtitle": "Net aggregate returns"
            })
            
        # 4. Quantity / Volume KPI
        qty_matches = [c for c in num_cols if any(k in c.lower() for k in ["qty", "quantity", "units", "items", "volume"])]
        if qty_matches:
            qty_col = qty_matches[0]
            total_qty = float(df[qty_col].sum())
            kpis.append({
                "id": f"kpi_total_{qty_col}",
                "title": f"Total {qty_col.title()}",
                "column": qty_col,
                "aggregation": "sum",
                "value": round(total_qty, 0),
                "format": "number",
                "subtitle": "Total volume transacted"
            })
            
        # 5. Customer / User Count KPI
        cust_matches = [c for c in cols if any(k in c.lower() for k in ["customer", "client", "user", "account", "member"])]
        if cust_matches:
            c_col = cust_matches[0]
            unique_cust = int(df[c_col].nunique())
            kpis.append({
                "id": f"kpi_unique_{c_col}",
                "title": f"Unique {c_col.title()}",
                "column": c_col,
                "aggregation": "unique",
                "value": unique_cust,
                "format": "number",
                "subtitle": "Active customer entities"
            })
            
        # If fewer than 4 KPIs found, populate with general statistical KPIs
        if len(kpis) < 4 and num_cols:
            for c in num_cols:
                if len(kpis) >= 4:
                    break
                if not any(k["column"] == c for k in kpis):
                    mean_val = float(df[c].mean())
                    kpis.append({
                        "id": f"kpi_mean_{c}",
                        "title": f"Mean {c.title()}",
                        "column": c,
                        "aggregation": "avg",
                        "value": round(mean_val, 2),
                        "format": "number",
                        "subtitle": f"Mathematical average of {c}"
                    })
                    
        return kpis

    @classmethod
    def generate_default_dashboard(cls, df: pd.DataFrame, dashboard_name: str = "Executive Overview") -> dict[str, Any]:
        """
        Creates a complete default dashboard with KPIs and pre-configured analytical charts.
        """
        kpis = cls.discover_kpis(df)
        cols = list(df.columns)
        num_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c])]
        cat_cols = [c for c in cols if not pd.api.types.is_numeric_dtype(df[c]) and df[c].nunique() <= 20]
        date_cols = [c for c in cols if pd.api.types.is_datetime64_any_dtype(df[c]) or "date" in c.lower()]

        charts = []
        
        # 1. Primary Breakdown Bar Chart
        if cat_cols and num_cols:
            c_col = cat_cols[0]
            n_col = num_cols[0]
            grouped = df.groupby(c_col)[n_col].sum().reset_index().sort_values(by=n_col, ascending=False).head(10)
            chart_data = [{"name": str(row[c_col]), "value": round(float(row[n_col]), 2)} for _, row in grouped.iterrows()]
            charts.append({
                "id": "chart_1",
                "type": "bar",
                "title": f"{n_col.title()} by {c_col.title()}",
                "x_key": "name",
                "y_key": "value",
                "data": chart_data
            })

        # 2. Composition Pie Chart
        if len(cat_cols) > 1:
            c_col = cat_cols[1]
            counts = df[c_col].value_counts().head(6).to_dict()
            pie_data = [{"name": str(k), "value": int(v)} for k, v in counts.items()]
            charts.append({
                "id": "chart_2",
                "type": "pie",
                "title": f"Share by {c_col.title()}",
                "category_key": "name",
                "value_key": "value",
                "data": pie_data
            })
        elif cat_cols:
            counts = df[cat_cols[0]].value_counts().head(6).to_dict()
            pie_data = [{"name": str(k), "value": int(v)} for k, v in counts.items()]
            charts.append({
                "id": "chart_2",
                "type": "pie",
                "title": f"Share by {cat_cols[0].title()}",
                "category_key": "name",
                "value_key": "value",
                "data": pie_data
            })

        # 3. Line Chart / Trend
        if date_cols and num_cols:
            d_col = date_cols[0]
            n_col = num_cols[0]
            df_temp = df[[d_col, n_col]].dropna().copy()
            df_temp[d_col] = pd.to_datetime(df_temp[d_col], errors='coerce').dt.strftime('%Y-%m-%d')
            grouped_date = df_temp.groupby(d_col)[n_col].sum().reset_index().sort_values(by=d_col).tail(15)
            line_data = [{"name": str(row[d_col]), "value": round(float(row[n_col]), 2)} for _, row in grouped_date.iterrows()]
            charts.append({
                "id": "chart_3",
                "type": "line",
                "title": f"Historical Trend: {n_col.title()}",
                "x_key": "name",
                "y_key": "value",
                "data": line_data
            })
        elif len(num_cols) >= 2:
            scatter_sample = df[[num_cols[0], num_cols[1]]].dropna().head(30)
            scatter_data = [{"x": round(float(r[num_cols[0]]), 2), "y": round(float(r[num_cols[1]]), 2)} for _, r in scatter_sample.iterrows()]
            charts.append({
                "id": "chart_3",
                "type": "scatter",
                "title": f"Correlation: {num_cols[0]} vs {num_cols[1]}",
                "x_key": "x",
                "y_key": "y",
                "data": scatter_data
            })

        return {
            "name": dashboard_name,
            "kpis": kpis,
            "charts": charts,
            "layout": {"columns": 3}
        }

