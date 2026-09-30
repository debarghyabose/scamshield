import os
import pickle
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

print("Loading the local SMSSpamCollection dataset...")
# Read the dataset file you dragged into the folder
df = pd.read_csv("ml_model/SMSSpamCollection", sep="\t", header=None, names=["label", "text"])

# --- BONUS: Injecting Multilingual/Indian Financial Scams ---
indian_scam_data = pd.DataFrame({
    "text": [
        "Aapka SBI KYC pending hai. Link par click karein: http://bit.ly/sbi-kyc",
        "Priye grahak, aapka electricity bill due hai. Power cut avoid karne ke liye call karein.",
        "Badhai ho! Aap 25 lakh KBC lottery jeet gaye hain. WhatsApp karein 9876543210 par.",
        "Your account is blocked. Update PAN card at http://pan-update.in",
        "Bhai kal college aayega?",
        "Maa, main ghar thodi der se aunga.",
        "Aaj class cancel ho gayi hai.",
        "Send me 500 rupees bro, urgent."
    ],
    "label": ["spam", "spam", "spam", "spam", "ham", "ham", "ham", "ham"]
})

# Combine the public dataset with our regional data
df = pd.concat([df, indian_scam_data], ignore_index=True)
print(f"Total messages in training dataset: {len(df)}")

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    df["text"], df["label"], test_size=0.2, random_state=42, stratify=df["label"]
)

print("Training the ML pipeline...")
# Build NLP Pipeline with character n-grams to handle weird spellings (like bl0cked)
model = make_pipeline(
    TfidfVectorizer(analyzer='char_wb', ngram_range=(2, 5), min_df=3),
    LogisticRegression(class_weight="balanced", max_iter=1000)
)

model.fit(X_train, y_train)

print("\n" + "=" * 50)
print("HACKATHON MODEL EVALUATION METRICS (Must-Have 6)")
print("=" * 50)
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))
print("Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))
print("=" * 50)

os.makedirs("ml_model", exist_ok=True)
with open("ml_model/spam_model.pkl", "wb") as f:
    pickle.dump(model, f)

print("\nSuccess! High-accuracy model saved to ml_model/spam_model.pkl")