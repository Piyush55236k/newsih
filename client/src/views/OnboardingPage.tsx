import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const features = [
  {
    id: 'soil',
    title: 'Fertilizer Recommendation',
    description: 'Get AI-powered fertilizer recommendations based on your soil test results',
    icon: '🌱',
    path: '/soil',
    color: 'green',
    gradient: 'linear-gradient(135deg, var(--green-50), var(--green-100))'
  },
  {
    id: 'weather',
    title: 'Weather Monitoring',
    description: 'Real-time weather data with agricultural alerts and recommendations',
    icon: '🌤️',
    path: '/weather',
    color: 'blue',
    gradient: 'linear-gradient(135deg, var(--blue-50), var(--blue-100))'
  },
  {
    id: 'pests',
    title: 'Pest Detection',
    description: 'AI-powered pest identification and treatment recommendations',
    icon: '🐛',
    path: '/pests',
    color: 'orange',
    gradient: 'linear-gradient(135deg, var(--orange-50), var(--orange-100))'
  },
  {
    id: 'market',
    title: 'Market Prices',
    description: 'Live commodity prices and market trends for better selling decisions',
    icon: '💰',
    path: '/market',
    color: 'yellow',
    gradient: 'linear-gradient(135deg, var(--yellow-50), var(--yellow-100))'
  },
  {
    id: 'advisory',
    title: 'Crop Advisory',
    description: 'Expert crop management advice and seasonal recommendations',
    icon: '🌾',
    path: '/advisory',
    color: 'green',
    gradient: 'linear-gradient(135deg, var(--green-50), var(--green-100))'
  },
  {
    id: 'voice',
    title: 'Voice Assistant',
    description: 'Hands-free voice commands for quick access to all features',
    icon: '🎤',
    path: '/voice',
    color: 'purple',
    gradient: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)'
  },
  {
    id: 'community',
    title: 'Community Forum',
    description: 'Connect with fellow farmers and share experiences',
    icon: '👥',
    path: '/community',
    color: 'blue',
    gradient: 'linear-gradient(135deg, var(--blue-50), var(--blue-100))'
  },
  {
    id: 'quests',
    title: 'Learning Quests',
    description: 'Complete tasks to earn points and improve your farming knowledge',
    icon: '🎯',
    path: '/quests',
    color: 'red',
    gradient: 'linear-gradient(135deg, var(--red-50), var(--red-100))'
  },
  {
    id: 'feedback',
    title: 'Feedback & Support',
    description: 'Share your feedback and get help from our support team',
    icon: '💬',
    path: '/feedback',
    color: 'green',
    gradient: 'linear-gradient(135deg, var(--green-50), var(--green-100))'
  }
];

export default function OnboardingPage() {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  return (
    <motion.div 
      className="onboarding-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Hero Section */}
      <motion.div 
        className="onboarding-hero"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to <span className="brand-name">Agro Mitra</span>
          </h1>
          <p className="hero-subtitle">
            Your comprehensive agricultural companion for modern farming
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">9+</span>
              <span className="stat-label">Features</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">AI</span>
              <span className="stat-label">Powered</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Available</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Features Grid */}
      <motion.div 
        className="features-section"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="section-header">
          <h2>Explore All Features</h2>
          <p>Choose any feature to get started with your agricultural journey</p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              className={`feature-card ${selectedFeature === feature.id ? 'selected' : ''}`}
              style={{ background: feature.gradient }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ 
                scale: 1.05, 
                y: -8,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedFeature(feature.id)}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <Link 
                to={feature.path}
                className="feature-link"
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  className="feature-button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Get Started →
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        className="quick-actions"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <div className="section-header">
          <h2>Quick Actions</h2>
          <p>Most popular features for quick access</p>
        </div>

        <div className="quick-actions-grid">
          <Link to="/soil" className="quick-action-card primary">
            <div className="quick-action-icon">🌱</div>
            <div className="quick-action-content">
              <h3>Fertilizer Recommendation</h3>
              <p>Get fertilizer recommendations</p>
            </div>
          </Link>

          <Link to="/weather" className="quick-action-card secondary">
            <div className="quick-action-icon">🌤️</div>
            <div className="quick-action-content">
              <h3>Weather Check</h3>
              <p>View current conditions</p>
            </div>
          </Link>

          <Link to="/market" className="quick-action-card tertiary">
            <div className="quick-action-icon">💰</div>
            <div className="quick-action-content">
              <h3>Market Prices</h3>
              <p>Check commodity rates</p>
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Voice Assistant Highlight */}
      <motion.div 
        className="voice-highlight"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <div className="voice-highlight-content">
          <div className="voice-highlight-icon">🎤</div>
          <div className="voice-highlight-text">
            <h3>Voice Assistant Available</h3>
            <p>Use the floating microphone button to access all features hands-free</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
