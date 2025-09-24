# Vercel Python Serverless Function entrypoint
from models.app import create_app

# Exported Flask app for Vercel runtime
app = create_app()
