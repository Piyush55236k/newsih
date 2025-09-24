from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from tensorflow import keras
from PIL import Image
import numpy as np
import io
import base64
import logging
import os
from typing import Dict, List, Tuple, Any

# Disease classes - common plant diseases
DISEASE_CLASSES = [
    'Healthy',
    'Apple___Apple_scab',
    'Apple___Black_rot',
    'Apple___Cedar_apple_rust',
    'Cherry___Powdery_mildew',
    'Cherry___healthy',
    'Corn___Cercospora_leaf_spot',
    'Corn___Common_rust',
    'Corn___Northern_Leaf_Blight',
    'Corn___healthy',
    'Grape___Black_rot',
    'Grape___Esca_(Black_Measles)',
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)',
    'Grape___healthy',
    'Orange___Haunglongbing_(Citrus_greening)',
    'Peach___Bacterial_spot',
    'Pepper___Bacterial_spot',
    'Pepper___healthy',
    'Potato___Early_blight',
    'Potato___Late_blight',
    'Potato___healthy',
    'Strawberry___Leaf_scorch',
    'Strawberry___healthy',
    'Tomato___Bacterial_spot',
    'Tomato___Early_blight',
    'Tomato___Late_blight',
    'Tomato___Leaf_Mold',
    'Tomato___Septoria_leaf_spot',
    'Tomato___Spider_mites_Two-spotted_spider_mite',
    'Tomato___Target_Spot',
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
    'Tomato___Tomato_mosaic_virus',
    'Tomato___healthy'
]

# Treatment recommendations for each disease
TREATMENTS = {
    'Healthy': [
        'Plant appears healthy',
        'Continue regular care and monitoring',
        'Maintain proper watering and fertilization'
    ],
    'Apple___Apple_scab': [
        'Remove fallen leaves and infected fruit',
        'Apply fungicide during wet periods',
        'Improve air circulation around trees'
    ],
    'Apple___Black_rot': [
        'Prune infected branches and cankers',
        'Apply fungicide before bud break',
        'Remove mummified fruit'
    ],
    'Apple___Cedar_apple_rust': [
        'Remove cedar trees within 1-2 miles if possible',
        'Apply fungicide preventively',
        'Choose rust-resistant apple varieties'
    ],
    'Cherry___Powdery_mildew': [
        'Improve air circulation',
        'Apply sulfur-based fungicide',
        'Remove infected shoots in winter'
    ],
    'Corn___Cercospora_leaf_spot': [
        'Rotate crops to break disease cycle',
        'Apply fungicide if severe',
        'Plant resistant varieties'
    ],
    'Corn___Common_rust': [
        'Plant resistant hybrids',
        'Apply fungicide if conditions favor disease',
        'Remove crop debris after harvest'
    ],
    'Corn___Northern_Leaf_Blight': [
        'Use resistant corn varieties',
        'Apply fungicide during tasseling',
        'Practice crop rotation'
    ],
    'Grape___Black_rot': [
        'Remove mummified berries and infected canes',
        'Apply fungicide from bud break to harvest',
        'Improve air circulation'
    ],
    'Grape___Esca_(Black_Measles)': [
        'Remove infected wood',
        'Protect pruning wounds',
        'No effective chemical control available'
    ],
    'Orange___Haunglongbing_(Citrus_greening)': [
        'Remove infected trees immediately',
        'Control Asian citrus psyllid vectors',
        'Use certified disease-free nursery stock'
    ],
    'Peach___Bacterial_spot': [
        'Apply copper-based bactericide',
        'Improve air circulation',
        'Avoid overhead irrigation'
    ],
    'Pepper___Bacterial_spot': [
        'Use pathogen-free seeds',
        'Apply copper bactericide',
        'Avoid working with wet plants'
    ],
    'Potato___Early_blight': [
        'Apply fungicide preventively',
        'Remove infected foliage',
        'Practice crop rotation'
    ],
    'Potato___Late_blight': [
        'Apply fungicide immediately',
        'Remove infected plants',
        'Avoid overhead irrigation'
    ],
    'Strawberry___Leaf_scorch': [
        'Remove infected leaves',
        'Improve air circulation',
        'Apply fungicide if severe'
    ],
    'Tomato___Bacterial_spot': [
        'Use copper-based sprays',
        'Avoid overhead watering',
        'Remove infected plant debris'
    ],
    'Tomato___Early_blight': [
        'Apply fungicide preventively',
        'Stake plants for better air flow',
        'Water at soil level'
    ],
    'Tomato___Late_blight': [
        'Apply fungicide immediately',
        'Remove infected plants',
        'Ensure good drainage'
    ],
    'Tomato___Leaf_Mold': [
        'Improve greenhouse ventilation',
        'Reduce humidity',
        'Apply fungicide if needed'
    ],
    'Tomato___Septoria_leaf_spot': [
        'Remove lower leaves',
        'Apply fungicide',
        'Mulch around plants'
    ],
    'Tomato___Spider_mites_Two-spotted_spider_mite': [
        'Increase humidity around plants',
        'Use miticide if severe',
        'Remove heavily infested leaves'
    ],
    'Tomato___Target_Spot': [
        'Apply fungicide',
        'Remove infected debris',
        'Improve air circulation'
    ],
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus': [
        'Control whitefly vectors',
        'Remove infected plants',
        'Use virus-resistant varieties'
    ],
    'Tomato___Tomato_mosaic_virus': [
        'Remove infected plants',
        'Disinfect tools between plants',
        'Use resistant varieties'
    ]
}

def create_disease_model():
    """Create a simple CNN model for plant disease detection"""
    model = keras.Sequential([
        keras.layers.Rescaling(1./255, input_shape=(224, 224, 3)),
        
        keras.layers.Conv2D(32, (3, 3), activation='relu'),
        keras.layers.MaxPooling2D((2, 2)),
        keras.layers.BatchNormalization(),
        
        keras.layers.Conv2D(64, (3, 3), activation='relu'),
        keras.layers.MaxPooling2D((2, 2)),
        keras.layers.BatchNormalization(),
        
        keras.layers.Conv2D(128, (3, 3), activation='relu'),
        keras.layers.MaxPooling2D((2, 2)),
        keras.layers.BatchNormalization(),
        
        keras.layers.Conv2D(256, (3, 3), activation='relu'),
        keras.layers.GlobalAveragePooling2D(),
        
        keras.layers.Dense(512, activation='relu'),
        keras.layers.Dropout(0.5),
        keras.layers.Dense(len(DISEASE_CLASSES), activation='softmax')
    ])
    
    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

def create_app() -> Flask:
    app = Flask(__name__)
    
    # Configure CORS
    frontend_origin = os.environ.get("FRONTEND_ORIGIN")
    if frontend_origin:
        CORS(app, origins=[frontend_origin], supports_credentials=True)
    else:
        CORS(app)
    
    # Set up logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
    
    # Load or create model
    global disease_model
    try:
        # Try to load pre-trained model if available
        disease_model = keras.models.load_model('disease_model.h5')
        logging.info("Loaded existing disease detection model")
    except:
        # Create new model (would need training in production)
        disease_model = create_disease_model()
        logging.info("Created new disease detection model (untrained)")
    
    @app.route("/")
    def home():
        return "Plant Disease Detection API is running!", 200
    
    @app.route("/api/health")
    def health():
        return jsonify({"ok": True, "model_loaded": disease_model is not None}), 200
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        logging.error(f"Unhandled error: {e}")
        return jsonify({"error": "Internal server error"}), 500
    
    def preprocess_image(image_data: str) -> np.ndarray:
        """Preprocess image for disease detection"""
        try:
            # Handle base64 image data
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
            # Decode base64
            image_bytes = base64.b64decode(image_data)
            
            # Open with PIL
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize to model input size
            image = image.resize((224, 224))
            
            # Convert to numpy array
            image_array = np.array(image)
            
            # Add batch dimension
            image_array = np.expand_dims(image_array, axis=0)
            
            return image_array
            
        except Exception as e:
            raise ValueError(f"Failed to preprocess image: {str(e)}")
    
    def get_mock_prediction(image_array: np.ndarray) -> Tuple[str, float, List[str]]:
        """Generate mock prediction for demonstration"""
        # Simple heuristic based on color analysis (similar to original)
        image = image_array[0]  # Remove batch dimension
        
        # Calculate color statistics
        mean_colors = np.mean(image, axis=(0, 1))
        r, g, b = mean_colors
        
        # Simple disease detection heuristic
        if g < 100 and (r > g * 1.2 or b > g * 1.2):
            # Brownish/yellowish colors might indicate disease
            disease_idx = np.random.choice([1, 7, 18, 19, 24, 25])  # Some disease classes
            confidence = 0.7 + np.random.random() * 0.2
        elif g > 120 and r < g * 0.8 and b < g * 0.8:
            # Very green - likely healthy
            healthy_idx = [0, 5, 9, 13, 17, 20, 22, 32]  # Healthy classes
            disease_idx = np.random.choice(healthy_idx)
            confidence = 0.8 + np.random.random() * 0.15
        else:
            # Mixed colors - random disease
            disease_idx = np.random.randint(0, len(DISEASE_CLASSES))
            confidence = 0.6 + np.random.random() * 0.25
        
        disease_name = DISEASE_CLASSES[disease_idx]
        treatments = TREATMENTS.get(disease_name, [
            'Monitor plant closely',
            'Consult local agricultural extension',
            'Maintain proper plant care'
        ])
        
        return disease_name, confidence, treatments
    
    @app.route("/detect", methods=["POST"])
    def detect_disease():
        """API endpoint for plant disease detection"""
        try:
            data = request.json
            if not data or 'image' not in data:
                return jsonify({"error": "No image data provided"}), 400
            
            # Preprocess image
            image_array = preprocess_image(data['image'])
            
            # For demo purposes, use mock prediction
            # In production, you would use: predictions = disease_model.predict(image_array)
            disease_name, confidence, treatments = get_mock_prediction(image_array)
            
            # Format response
            response = {
                "disease": disease_name,
                "confidence": float(confidence),
                "treatments": treatments,
                "plant_type": disease_name.split('___')[0] if '___' in disease_name else 'Unknown',
                "severity": "High" if confidence > 0.8 else "Medium" if confidence > 0.6 else "Low"
            }
            
            logging.info(f"Disease detection: {disease_name} ({confidence:.2f})")
            return jsonify(response)
            
        except ValueError as ve:
            logging.warning(f"Validation error: {ve}")
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            logging.error(f"Error in detect_disease: {e}")
            return jsonify({"error": "Prediction failed"}), 500
    
    return app

# Create the Flask app
app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=8000)