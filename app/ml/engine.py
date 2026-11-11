import os
import joblib
import numpy as np
import pandas as pd
from typing import Any, Optional

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
from sklearn.cluster import KMeans
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score, silhouette_score
)
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.arima.model import ARIMA

from app.core.config import settings

class MLEngine:
    """
    Predictive Machine Learning Studio engine supporting Regression,
    Classification, Clustering, and Time-Series Forecasting.
    """

    @staticmethod
    def preprocess_features(df: pd.DataFrame, feature_cols: list[str]) -> tuple[np.ndarray, dict[str, Any]]:
        """
        Preprocesses feature columns: handles missing values, encodes categoricals, scales numericals.
        Returns: (processed_X, metadata_encoders)
        """
        X_df = df[feature_cols].copy()
        encoders = {}
        processed_dfs = []
        
        for col in feature_cols:
            series = X_df[col]
            if pd.api.types.is_numeric_dtype(series):
                imputer = SimpleImputer(strategy="median")
                vals = imputer.fit_transform(series.values.reshape(-1, 1))
                encoders[col] = {"type": "numeric", "imputer": imputer}
                processed_dfs.append(pd.DataFrame(vals, columns=[col], index=X_df.index))
            else:
                str_series = series.fillna("Unknown").astype(str)
                le = LabelEncoder()
                vals = le.fit_transform(str_series)
                encoders[col] = {
                    "type": "categorical", 
                    "classes": le.classes_.tolist(),
                    "encoder": le
                }
                processed_dfs.append(pd.DataFrame(vals, columns=[col], index=X_df.index))
                
        merged = pd.concat(processed_dfs, axis=1)
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(merged.values)
        encoders["_scaler"] = scaler
        encoders["_feature_names"] = merged.columns.tolist()
        
        return X_scaled, encoders

    @staticmethod
    def transform_single_input(raw_inputs: dict[str, Any], encoders: dict[str, Any], feature_cols: list[str]) -> np.ndarray:
        """
        Prepares a single dictionary input for inference using saved encoders.
        """
        row_vals = []
        for col in feature_cols:
            val = raw_inputs.get(col)
            enc = encoders.get(col, {})
            if enc.get("type") == "numeric":
                try:
                    num_val = float(val) if val is not None else 0.0
                except (ValueError, TypeError):
                    num_val = 0.0
                row_vals.append(num_val)
            else:
                str_val = str(val) if val is not None else "Unknown"
                classes = enc.get("classes", [])
                if str_val in classes:
                    idx = classes.index(str_val)
                else:
                    idx = 0
                row_vals.append(idx)
                
        X_raw = np.array([row_vals])
        scaler = encoders.get("_scaler")
        if scaler:
            X_scaled = scaler.transform(X_raw)
            return X_scaled
        return X_raw

    @classmethod
    def train_regression(
        cls, df: pd.DataFrame, target_col: str, feature_cols: list[str], 
        algorithm: str, test_size: float = 0.2
    ) -> dict[str, Any]:
        valid_df = df.dropna(subset=[target_col]).copy()
        y = valid_df[target_col].astype(float).values
        X, encoders = cls.preprocess_features(valid_df, feature_cols)
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
        
        if algorithm == "LinearRegression":
            model = LinearRegression()
        elif algorithm == "RandomForestRegressor":
            model = RandomForestRegressor(n_estimators=100, random_state=42)
        elif algorithm == "DecisionTreeRegressor":
            model = DecisionTreeRegressor(random_state=42)
        elif algorithm == "GradientBoostingRegressor":
            model = GradientBoostingRegressor(random_state=42)
        else:
            model = RandomForestRegressor(n_estimators=100, random_state=42)
            algorithm = "RandomForestRegressor"
            
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        
        mae = float(mean_absolute_error(y_test, y_pred))
        mse = float(mean_squared_error(y_test, y_pred))
        rmse = float(np.sqrt(mse))
        r2 = float(r2_score(y_test, y_pred))
        
        # Feature importance
        feature_importance = []
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
            feature_importance = [
                {"feature": col, "importance": round(float(imp), 4)}
                for col, imp in sorted(zip(feature_cols, importances), key=lambda x: x[1], reverse=True)
            ]
        elif hasattr(model, "coef_"):
            coefs = np.abs(model.coef_)
            feature_importance = [
                {"feature": col, "importance": round(float(imp), 4)}
                for col, imp in sorted(zip(feature_cols, coefs), key=lambda x: x[1], reverse=True)
            ]
            
        # Actual vs Predicted chart sample
        sample_size = min(50, len(y_test))
        eval_chart = [
            {"index": i + 1, "actual": round(float(y_test[i]), 2), "predicted": round(float(y_pred[i]), 2)}
            for i in range(sample_size)
        ]
        
        return {
            "model": model,
            "encoders": encoders,
            "metrics": {
                "mae": round(mae, 4),
                "mse": round(mse, 4),
                "rmse": round(rmse, 4),
                "r2": round(r2, 4)
            },
            "feature_importance": feature_importance,
            "evaluation_chart_data": eval_chart
        }

    @classmethod
    def train_classification(
        cls, df: pd.DataFrame, target_col: str, feature_cols: list[str], 
        algorithm: str, test_size: float = 0.2
    ) -> dict[str, Any]:
        valid_df = df.dropna(subset=[target_col]).copy()
        y_raw = valid_df[target_col].astype(str).values
        target_encoder = LabelEncoder()
        y = target_encoder.fit_transform(y_raw)
        target_classes = target_encoder.classes_.tolist()
        
        X, encoders = cls.preprocess_features(valid_df, feature_cols)
        encoders["_target_classes"] = target_classes
        encoders["_target_encoder"] = target_encoder
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42, stratify=y if len(np.unique(y)) > 1 and np.min(np.bincount(y)) > 1 else None)
        
        if algorithm == "LogisticRegression":
            model = LogisticRegression(max_iter=1000, random_state=42)
        elif algorithm == "RandomForestClassifier":
            model = RandomForestClassifier(n_estimators=100, random_state=42)
        elif algorithm == "DecisionTreeClassifier":
            model = DecisionTreeClassifier(random_state=42)
        elif algorithm == "GradientBoostingClassifier":
            model = GradientBoostingClassifier(random_state=42)
        else:
            model = RandomForestClassifier(n_estimators=100, random_state=42)
            algorithm = "RandomForestClassifier"
            
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        
        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
        rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
        f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
        cm = confusion_matrix(y_test, y_pred).tolist()
        
        roc_auc = None
        if len(target_classes) == 2 and hasattr(model, "predict_proba"):
            try:
                y_prob = model.predict_proba(X_test)[:, 1]
                roc_auc = float(roc_auc_score(y_test, y_prob))
            except Exception:
                pass
                
        feature_importance = []
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
            feature_importance = [
                {"feature": col, "importance": round(float(imp), 4)}
                for col, imp in sorted(zip(feature_cols, importances), key=lambda x: x[1], reverse=True)
            ]
            
        # Confusion matrix data formatted for charts
        eval_chart = []
        for i, row in enumerate(cm):
            for j, val in enumerate(row):
                eval_chart.append({
                    "actual": target_classes[i] if i < len(target_classes) else str(i),
                    "predicted": target_classes[j] if j < len(target_classes) else str(j),
                    "count": int(val)
                })
                
        return {
            "model": model,
            "encoders": encoders,
            "metrics": {
                "accuracy": round(acc, 4),
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1_score": round(f1, 4),
                "confusion_matrix": cm,
                "roc_auc": round(roc_auc, 4) if roc_auc is not None else None
            },
            "feature_importance": feature_importance,
            "evaluation_chart_data": eval_chart
        }

    @classmethod
    def train_clustering(cls, df: pd.DataFrame, feature_cols: list[str], n_clusters: int = 3) -> dict[str, Any]:
        X, encoders = cls.preprocess_features(df, feature_cols)
        n_clusters = min(n_clusters, max(len(df) - 1, 2))
        
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(X)
        
        sil = float(silhouette_score(X, labels)) if len(np.unique(labels)) > 1 and len(df) > n_clusters else 0.0
        dist = {f"Cluster {i}": int((labels == i).sum()) for i in range(n_clusters)}
        
        # Cluster centers chart data
        eval_chart = [
            {"cluster": f"Cluster {i}", "count": int((labels == i).sum())}
            for i in range(n_clusters)
        ]
        
        return {
            "model": kmeans,
            "encoders": encoders,
            "metrics": {
                "silhouette_score": round(sil, 4),
                "cluster_distribution": dist
            },
            "feature_importance": [],
            "evaluation_chart_data": eval_chart
        }

    @classmethod
    def train_forecasting(cls, df: pd.DataFrame, target_col: str, date_col: str, algorithm: str) -> dict[str, Any]:
        ts_df = df[[date_col, target_col]].dropna().copy()
        ts_df[date_col] = pd.to_datetime(ts_df[date_col], errors='coerce')
        ts_df = ts_df.dropna().sort_values(by=date_col)
        
        y = ts_df[target_col].astype(float).values
        n = len(y)
        train_size = int(n * 0.8)
        y_train, y_test = y[:train_size], y[train_size:]
        
        if algorithm == "MovingAverage":
            window = min(3, len(y_train))
            pred = pd.Series(y).rolling(window=window).mean().iloc[train_size:].fillna(y_train[-1]).values
            model = {"type": "MovingAverage", "window": window, "last_vals": y[-window:].tolist()}
        elif algorithm == "ARIMA":
            try:
                arima_fit = ARIMA(y_train, order=(1, 1, 1)).fit()
                pred = arima_fit.forecast(steps=len(y_test))
                model = arima_fit
            except Exception:
                pred = np.full(len(y_test), y_train.mean())
                model = {"type": "FallbackMean", "val": float(y_train.mean())}
        else: # ExponentialSmoothing
            try:
                es_fit = ExponentialSmoothing(y_train, trend="add").fit()
                pred = es_fit.forecast(len(y_test))
                model = es_fit
            except Exception:
                pred = np.full(len(y_test), y_train.mean())
                model = {"type": "FallbackMean", "val": float(y_train.mean())}
                
        mae = float(mean_absolute_error(y_test, pred)) if len(y_test) > 0 else 0.0
        rmse = float(np.sqrt(mean_squared_error(y_test, pred))) if len(y_test) > 0 else 0.0
        
        eval_chart = [
            {"date": str(ts_df[date_col].iloc[train_size + i])[:10], "actual": round(float(y_test[i]), 2), "forecast": round(float(pred[i]), 2)}
            for i in range(min(len(y_test), len(pred)))
        ]
        
        return {
            "model": model,
            "encoders": {"date_col": date_col, "target_col": target_col},
            "metrics": {
                "mae": round(mae, 4),
                "rmse": round(rmse, 4)
            },
            "feature_importance": [],
            "evaluation_chart_data": eval_chart
        }

