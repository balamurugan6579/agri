import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
import joblib
import os

# Define the crops and their ideal condition ranges
# Format: [N_min, N_max, P_min, P_max, K_min, K_max, Temp_min, Temp_max, Hum_min, Hum_max, pH_min, pH_max, Rain_min, Rain_max]
crop_data_rules = {
    'rice': [60, 100, 35, 60, 35, 60, 20, 35, 80, 100, 5.5, 7.0, 150, 300],
    'maize': [60, 100, 40, 60, 20, 50, 18, 27, 50, 80, 5.5, 7.0, 60, 100],
    'chickpea': [20, 60, 40, 80, 20, 60, 15, 30, 15, 50, 6.0, 8.0, 40, 100],
    'kidneybeans': [10, 40, 30, 70, 15, 45, 15, 25, 15, 50, 5.5, 6.5, 40, 120],
    'pigeonpeas': [10, 40, 40, 80, 15, 45, 20, 35, 15, 50, 5.0, 7.5, 40, 120],
    'mothbeans': [10, 40, 30, 70, 15, 45, 25, 32, 30, 60, 5.5, 7.5, 30, 80],
    'mungbean': [10, 40, 30, 70, 15, 45, 25, 32, 60, 85, 6.0, 7.5, 30, 80],
    'blackgram': [20, 60, 40, 80, 15, 45, 25, 35, 60, 85, 6.0, 7.5, 40, 100],
    'lentil': [10, 40, 30, 70, 15, 45, 15, 30, 20, 50, 5.9, 7.5, 30, 80],
    'pomegranate': [10, 50, 10, 40, 10, 50, 18, 30, 15, 55, 5.5, 7.2, 50, 120],
    'banana': [80, 120, 70, 95, 35, 65, 25, 35, 70, 90, 5.5, 7.0, 80, 120],
    'mango': [10, 50, 10, 40, 20, 40, 25, 35, 45, 80, 4.5, 7.0, 80, 120],
    'grapes': [10, 50, 100, 140, 190, 210, 10, 40, 75, 85, 5.5, 6.5, 50, 120],
    'watermelon': [40, 80, 10, 50, 40, 70, 24, 30, 80, 95, 6.0, 7.0, 40, 60],
    'muskmelon': [80, 120, 10, 50, 40, 70, 25, 30, 80, 95, 6.0, 7.0, 30, 60],
    'apple': [10, 40, 100, 140, 190, 210, 21, 25, 85, 95, 5.8, 6.5, 100, 180],
    'orange': [10, 50, 10, 40, 10, 35, 10, 35, 85, 95, 6.0, 7.5, 100, 180],
    'papaya': [30, 70, 40, 70, 40, 60, 22, 40, 85, 95, 6.0, 7.0, 40, 200],
    'coconut': [10, 50, 10, 40, 15, 45, 25, 30, 90, 99, 5.5, 7.0, 100, 250],
    'cotton': [100, 140, 35, 60, 15, 25, 22, 28, 70, 90, 5.8, 7.8, 60, 100],
    'jute': [60, 100, 35, 60, 35, 50, 23, 28, 70, 90, 6.0, 7.5, 150, 250],
    'coffee': [80, 120, 15, 40, 20, 40, 23, 28, 50, 70, 6.0, 7.8, 120, 200]
}

from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

# ... (keep existing imports and crop_data_rules) ...

def generate_synthetic_data(num_samples=10000):
    data = []
    labels = []
    
    crops = list(crop_data_rules.keys())
    
    for _ in range(num_samples):
        crop = np.random.choice(crops)
        rules = crop_data_rules[crop]
        
        # N, P, K, Temp, Hum, pH, Rain
        N = np.random.uniform(rules[0], rules[1])
        P = np.random.uniform(rules[2], rules[3])
        K = np.random.uniform(rules[4], rules[5])
        temp = np.random.uniform(rules[6], rules[7])
        hum = np.random.uniform(rules[8], rules[9])
        ph = np.random.uniform(rules[10], rules[11])
        rain = np.random.uniform(rules[12], rules[13])
        
        # Add realistic noise/variability
        N += np.random.normal(0, 5)
        P += np.random.normal(0, 5)
        K += np.random.normal(0, 5)
        temp += np.random.normal(0, 2)
        hum += np.random.normal(0, 5)
        rain += np.random.normal(0, 10)
        
        data.append([N, P, K, temp, hum, ph, rain])
        labels.append(crop)
        
    return np.array(data), np.array(labels)

def train():
    print("Generating extended synthetic data (10,000 samples)...")
    X, y = generate_synthetic_data(10000)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scaling is crucial for accuracy in some models (SVM, LR)
    print("Scaling features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    models = {
        "Random Forest": RandomForestClassifier(n_estimators=200, random_state=42),
        "Logistic Regression": LogisticRegression(max_iter=3000),
        "Gradient Boosting": GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42),
        "SVM": SVC(kernel='rbf', probability=True),
        "Naive Bayes": GaussianNB()
    }
    
    best_accuracy = 0
    best_model_name = ""
    best_model = None
    
    print("\nTraining and evaluating models...")
    print("-" * 50)
    
    for name, model in models.items():
        # Use scaled data for all (tree-based models don't strictly need it but it doesn't hurt)
        model.fit(X_train_scaled, y_train)
        preds = model.predict(X_test_scaled)
        acc = accuracy_score(y_test, preds)
        
        print(f"{name} Accuracy: {acc*100:.2f}%")
        
        if acc > best_accuracy:
            best_accuracy = acc
            best_model_name = name
            best_model = model

    print("-" * 50)
    print(f"Best Model: {best_model_name} with {best_accuracy*100:.2f}% Accuracy")
    
    # Detailed report for best model
    # preds = best_model.predict(X_test_scaled)
    # print("\nClassification Report:")
    # print(classification_report(y_test, preds))
    
    print("\nSaving best model and scaler...")
    joblib.dump(best_model, 'crop_recommendation_model.pkl')
    joblib.dump(scaler, 'scaler.pkl')
    print("Files saved: crop_recommendation_model.pkl, scaler.pkl")

if __name__ == "__main__":
    train()
