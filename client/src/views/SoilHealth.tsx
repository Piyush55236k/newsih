import React, { useState } from 'react';
import { motion } from 'framer-motion';

const crops = [
	'Wheat', 'Rice', 'Maize', 'Barley', 'Soybean', 'Cotton', 'Sugarcane', 'Potato', 'Tomato', 'Onion', 'Other'
];

export default function SoilHealth() {
	const [form, setForm] = useState({
		crop: crops[0],
		soil: ''
	});
	const [ai, setAi] = useState<any>(null);
	const [aiLoading, setAiLoading] = useState(false);
	const [aiError, setAiError] = useState('');
	const [apiStatus, setApiStatus] = useState<'unknown'|'online'|'offline'>('unknown');

	function update(field: string, value: string) {
		setForm(f => ({ ...f, [field]: value }));
	}



	async function runAI() {
		setAiError('');
		setAiLoading(true);
		setAi(null);
		try {
			const payload = {
				crop: form.crop,
				soil: form.soil
			};
			const r = await fetch('/api/recommend', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!r.ok) throw new Error(`Request failed (${r.status})`);
			const resp = await r.json();
			setAi(resp);
		} catch (e: any) {
			setAiError(String(e?.message || e));
		} finally {
			setAiLoading(false);
		}
	}

	return (
		<motion.div 
			className="grid" 
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6 }}
		>
					<motion.section className="card fade-in" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
						<div className="card-header">
							<h2>🌱 Fertilizer Recommendations</h2>
							<p className="muted">Enter crop and soil type to get AI-powered fertilizer guidance.</p>
						</div>
						<div className="form-grid">
							<div className="form-group">
								<label>Crop Type</label>
								<select 
									value={form.crop} 
									onChange={e => update('crop', e.target.value)}
									className="form-select"
								>
									{crops.map(c => <option key={c} value={c}>{c}</option>)}
								</select>
							</div>
							<div className="form-group">
								<label>Soil Type</label>
								<input 
									type="text" 
									value={form.soil} 
									onChange={e => update('soil', e.target.value)} 
									placeholder="e.g. Loamy, Sandy, Clay" 
									className="form-input"
								/>
							</div>
						</div>
						<div className="action-section">
							<motion.button 
								onClick={runAI} 
								disabled={aiLoading}
								className={`primary-btn ${aiLoading ? 'loading' : ''}`}
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								animate={aiLoading ? { scale: [1, 1.02, 1] } : {}}
								transition={{ duration: 0.5, repeat: aiLoading ? Infinity : 0 }}
							>
								{aiLoading ? (
									<>
										<span className="loading-spinner"></span>
										Running AI Analysis...
									</>
								) : (
									<>
										<span className="btn-icon">🤖</span>
										Get AI Recommendation
									</>
								)}
							</motion.button>
							{aiError && (
								<motion.div 
									className="error-message"
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.3 }}
								>
									<span className="error-icon">⚠️</span>
									{aiError}
								</motion.div>
							)}
						</div>
					</motion.section>

				<div className="action-section">
					<motion.button 
						onClick={runAI} 
						disabled={aiLoading}
						className={`primary-btn ${aiLoading ? 'loading' : ''}`}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						animate={aiLoading ? { scale: [1, 1.02, 1] } : {}}
						transition={{ duration: 0.5, repeat: aiLoading ? Infinity : 0 }}
					>
						{aiLoading ? (
							<>
								<span className="loading-spinner"></span>
								Running AI Analysis...
							</>
						) : (
							<>
								<span className="btn-icon">🤖</span>
								Get AI Recommendation
							</>
						)}
					</motion.button>
					
					{aiError && (
						<motion.div 
							className="error-message"
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3 }}
						>
							<span className="error-icon">⚠️</span>
							{aiError}
						</motion.div>
					)}
				</div>
			</motion.section>

			{ai && (
				<motion.section 
					className="card result-card fade-in-delay-1"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					<div className="result-header">
						<h3>🎯 AI Model Recommendation</h3>
						<div className="success-badge">
							<span className="success-icon">✅</span>
							Analysis Complete
						</div>
					</div>

					{ai.messages && ai.messages.length > 0 && (
						<div className="recommendations">
							<h4>📋 Recommendations</h4>
							<ul className="recommendation-list">
								{ai.messages.map((m: any, i: number) => (
									<motion.li 
										key={i}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ duration: 0.3, delay: i * 0.1 }}
									>
										<span className="list-icon">💡</span>
										{m}
									</motion.li>
								))}
							</ul>
						</div>
					)}

					{ai.fert && ai.fert.length > 0 && (
						<div className="fertilizer-section">
							<h4>🌿 Recommended Fertilizers</h4>
							<div className="fertilizer-tags">
								{ai.fert.map((fertilizer: string, i: number) => (
									<motion.span 
										key={i}
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ duration: 0.3, delay: i * 0.1 }}
										className="fertilizer-tag"
									>
										{fertilizer}
									</motion.span>
								))}
							</div>
						</div>
					)}
