import re
import json
import httpx
import pandas as pd
from typing import Any, Optional
from app.core.config import settings
from app.database.session import duckdb_manager

class MultiAgentOrchestrator:
    """
    Coordinates 6 specialized AI data science agents:
    1. Data Analyst Agent
    2. Data Cleaning Agent
    3. Visualization Agent
    4. Machine Learning Agent
    5. Business Intelligence Agent
    6. Report Generation Agent
    """

    @staticmethod
    def _call_llm(system_prompt: str, user_prompt: str) -> Optional[str]:
        """
        Executes a completion request across configured LLM providers (Gemini, OpenAI, Ollama).
        Returns None if provider is 'none' or request fails.
        """
        provider = settings.LLM_PROVIDER.lower()
        if provider == "gemini" and settings.GEMINI_API_KEY:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                payload = {
                    "contents": [
                        {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}
                    ],
                    "generationConfig": {"temperature": 0.2}
                }
                with httpx.Client(timeout=settings.QUERY_TIMEOUT_SECONDS) as client:
                    resp = client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["candidates"][0]["content"]["parts"][0]["text"]
            except Exception:
                return None
                
        elif provider == "openai" and settings.OPENAI_API_KEY:
            try:
                url = "https://api.openai.com/v1/chat/completions"
                headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.2
                }
                with httpx.Client(timeout=settings.QUERY_TIMEOUT_SECONDS) as client:
                    resp = client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"]
            except Exception:
                return None
                
        elif provider == "ollama":
            try:
                url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
                payload = {
                    "model": settings.OLLAMA_MODEL,
                    "prompt": f"{system_prompt}\n\n{user_prompt}",
                    "stream": False
                }
                with httpx.Client(timeout=settings.QUERY_TIMEOUT_SECONDS) as client:
                    resp = client.post(url, json=payload)
                    if resp.status_code == 200:
                        return resp.json().get("response")
            except Exception:
                return None
                
        return None

    @classmethod
    def process_nl_query(
        cls, question: str, df: pd.DataFrame, table_name: str = "dataset"
    ) -> dict[str, Any]:
        """
        Transforms a user natural-language analytical question into a safe SQL query,
        executes it in DuckDB, builds chart configuration, and drafts a human explanation.
        """
        cols = list(df.columns)
        num_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c])]
        cat_cols = [c for c in cols if not pd.api.types.is_numeric_dtype(df[c]) and not pd.api.types.is_datetime64_any_dtype(df[c])]
        date_cols = [c for c in cols if pd.api.types.is_datetime64_any_dtype(df[c]) or "date" in c.lower() or "time" in c.lower() or "year" in c.lower()]

        schema_desc = ", ".join([f'"{c}" ({df[c].dtype})' for c in cols])
        q_lower = question.lower()
        
        sql_query = None
        explanation = ""
        chart_type = "bar"
        x_key = ""
        y_key = ""

        # Step 1: Check if an LLM is available to draft SQL
        llm_system = (
            f"You are a Senior SQL & DuckDB Data Analyst Agent. Given table '{table_name}' with columns: {schema_desc}. "
            "Write ONLY a single valid read-only DuckDB SQL query. No explanation, no markdown backticks, only SQL. "
            "Always wrap column names with double quotes."
        )
        llm_sql = cls._call_llm(llm_system, question)
        if llm_sql:
            cleaned = llm_sql.strip().replace("```sql", "").replace("```", "").strip()
            if cleaned.lower().startswith("select") or cleaned.lower().startswith("with"):
                sql_query = cleaned

        # Step 2: Deterministic Semantic SQL Engine (Fallback when LLM is unavailable or unconfigured)
        if not sql_query:
            # A. Total / Sum questions
            if any(w in q_lower for w in ["total", "sum", "overall"]) and num_cols:
                target_num = next((c for c in num_cols if any(k in q_lower for k in [c.lower(), "sale", "rev", "profit", "amount", "cost"])), num_cols[0])
                if cat_cols and any(c.lower() in q_lower for c in cat_cols):
                    group_cat = next(c for c in cat_cols if c.lower() in q_lower)
                    sql_query = f'SELECT "{group_cat}", ROUND(SUM("{target_num}"), 2) as "Total_{target_num}" FROM {table_name} GROUP BY "{group_cat}" ORDER BY "Total_{target_num}" DESC LIMIT 15'
                    chart_type = "bar"
                    x_key = group_cat
                    y_key = f"Total_{target_num}"
                else:
                    sql_query = f'SELECT ROUND(SUM("{target_num}"), 2) as "Total_{target_num}", ROUND(AVG("{target_num}"), 2) as "Average_{target_num}", COUNT(*) as "Record_Count" FROM {table_name}'
                    chart_type = "metric"
                    
            # B. Highest / Top / Best questions
            elif any(w in q_lower for w in ["highest", "top", "best", "max", "most"]):
                target_num = next((c for c in num_cols if any(k in q_lower for k in [c.lower(), "sale", "rev", "profit", "amount"])), num_cols[0] if num_cols else cols[0])
                group_cat = next((c for c in cat_cols if any(k in q_lower for k in [c.lower(), "product", "region", "customer", "category", "item"])), cat_cols[0] if cat_cols else cols[0])
                sql_query = f'SELECT "{group_cat}", ROUND(SUM("{target_num}"), 2) as "Metric_Value" FROM {table_name} GROUP BY "{group_cat}" ORDER BY "Metric_Value" DESC LIMIT 10'
                chart_type = "bar"
                x_key = group_cat
                y_key = "Metric_Value"

            # C. Monthly / Trends / Over time questions
            elif any(w in q_lower for w in ["trend", "month", "annual", "year", "time", "daily", "timeline"]) and (date_cols or num_cols):
                target_date = date_cols[0] if date_cols else cols[0]
                target_num = num_cols[0] if num_cols else cols[-1]
                sql_query = f'SELECT "{target_date}" as "Period", ROUND(SUM("{target_num}"), 2) as "Total_Value" FROM {table_name} GROUP BY "{target_date}" ORDER BY "Period" ASC LIMIT 30'
                chart_type = "line"
                x_key = "Period"
                y_key = "Total_Value"

            # D. Average questions
            elif any(w in q_lower for w in ["average", "avg", "mean"]) and num_cols:
                target_num = next((c for c in num_cols if any(k in q_lower for k in [c.lower(), "age", "price", "rating", "score"])), num_cols[0])
                if cat_cols:
                    group_cat = cat_cols[0]
                    sql_query = f'SELECT "{group_cat}", ROUND(AVG("{target_num}"), 2) as "Average_{target_num}" FROM {table_name} GROUP BY "{group_cat}" ORDER BY "Average_{target_num}" DESC LIMIT 10'
                    chart_type = "bar"
                    x_key = group_cat
                    y_key = f"Average_{target_num}"
                else:
                    sql_query = f'SELECT ROUND(AVG("{target_num}"), 2) as "Average_{target_num}", ROUND(MIN("{target_num}"), 2) as "Min", ROUND(MAX("{target_num}"), 2) as "Max" FROM {table_name}'
                    chart_type = "metric"

            # E. Unusual / Outliers questions
            elif any(w in q_lower for w in ["unusual", "outlier", "anomaly", "abnormal"]) and num_cols:
                target_num = num_cols[0]
                mean_val = df[target_num].mean()
                std_val = df[target_num].std() if df[target_num].std() > 0 else 1.0
                upper = mean_val + 2.5 * std_val
                lower = mean_val - 2.5 * std_val
                sql_query = f'SELECT * FROM {table_name} WHERE "{target_num}" > {upper} OR "{target_num}" < {lower} LIMIT 25'
                chart_type = "table"

            # F. Default breakdown / overview
            else:
                if cat_cols and num_cols:
                    sql_query = f'SELECT "{cat_cols[0]}", COUNT(*) as "Record_Count", ROUND(SUM("{num_cols[0]}"), 2) as "Total_{num_cols[0]}" FROM {table_name} GROUP BY "{cat_cols[0]}" ORDER BY "Record_Count" DESC LIMIT 10'
                    chart_type = "bar"
                    x_key = cat_cols[0]
                    y_key = f"Total_{num_cols[0]}"
                else:
                    sql_query = f'SELECT * FROM {table_name} LIMIT 10'
                    chart_type = "table"

        # Step 3: Execute safe query via DuckDB
        try:
            col_names, rows = duckdb_manager.execute_safe_query(sql_query, {table_name: df})
            result_data = [dict(zip(col_names, row)) for row in rows]
        except Exception as e:
            # Fallback to simple select
            sql_query = f'SELECT * FROM {table_name} LIMIT 10'
            col_names, rows = duckdb_manager.execute_safe_query(sql_query, {table_name: df})
            result_data = [dict(zip(col_names, row)) for row in rows]

        # Step 4: Generate Data Scientist Explanation
        if result_data:
            num_results = len(result_data)
            first_row = result_data[0]
            if len(first_row) == 1:
                k, v = list(first_row.items())[0]
                explanation = f"The query calculated **{k}** to be **{v:,.2f}**." if isinstance(v, (int, float)) else f"The calculated {k} is **{v}**."
            elif chart_type == "bar" and x_key and y_key and len(result_data) > 0:
                top_item = result_data[0].get(x_key, "Top Entity")
                top_val = result_data[0].get(y_key, 0)
                explanation = f"Analysis of **{x_key}** shows that **{top_item}** ranks highest with **{top_val:,.2f}**, followed by {num_results - 1} other recorded groups."
            elif chart_type == "line":
                explanation = f"Historical trend reveals {num_results} recorded timestamps across '{x_key}', illustrating pattern fluctuations."
            else:
                explanation = f"Executed analytical query successfully. Retrieved {num_results} structured records matching the criteria."
        else:
            explanation = "The query executed successfully, but returned no matching records for the specified condition."

        # Step 5: Format chart config for Recharts
        if not x_key and len(col_names) >= 2:
            x_key = col_names[0]
            y_key = col_names[1]

        chart_config = {
            "chart_type": chart_type,
            "title": question.title(),
            "x_key": x_key,
            "y_key": y_key,
            "data": result_data[:25]
        }

        return {
            "query_sql": sql_query,
            "explanation": explanation,
            "chart_config": chart_config,
            "execution_result": {
                "columns": col_names,
                "rows": result_data[:50],
                "total_rows": len(result_data)
            }
        }

