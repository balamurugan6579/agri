# ML Backend

This directory contains the Machine Learning backend for the AgriWise application.

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
2. Activate it:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Training

To retrain the models (Random Forest and Logistic Regression):
```bash
python train_model.py
```
This generates `crop_recommendation_model.pkl`.

## Running the Server

To start the prediction API:
```bash
python app.py
```
The server runs on `http://localhost:5000`.
The frontend is configured to communicate with this endpoint.
