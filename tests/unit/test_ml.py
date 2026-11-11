import pandas as pd
import numpy as np
from app.ml.engine import MLEngine

def test_regression_pipeline():
    np.random.seed(42)
    n = 60
    X1 = np.random.uniform(10, 100, n)
    X2 = np.random.uniform(1, 10, n)
    y = 2.5 * X1 + 10 * X2 + np.random.normal(0, 5, n)
    
    df = pd.DataFrame({"Feature1": X1, "Feature2": X2, "Target": y})
    result = MLEngine.train_regression(df, "Target", ["Feature1", "Feature2"], "LinearRegression")
    
    assert "metrics" in result
    assert result["metrics"]["r2"] > 0.85
    assert len(result["feature_importance"]) == 2

def test_classification_pipeline():
    np.random.seed(42)
    n = 80
    X1 = np.random.uniform(1, 10, n)
    X2 = np.random.choice(["Red", "Blue", "Green"], n)
    y = np.where(X1 > 5, "ClassA", "ClassB")
    
    df = pd.DataFrame({"Score": X1, "Color": X2, "Label": y})
    result = MLEngine.train_classification(df, "Label", ["Score", "Color"], "RandomForestClassifier")
    
    assert "metrics" in result
    assert result["metrics"]["accuracy"] > 0.80

