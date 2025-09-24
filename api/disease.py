# Disease Detection API Wrapper for Vercel
from models.disease_detection import create_app

# Export app for Vercel
app = create_app()