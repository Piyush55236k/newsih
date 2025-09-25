import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './ui/App'
import SoilHealth from './views/SoilHealth'
import Weather from './views/Weather'
import PestDetect from './views/PestDetect'
import Market from './views/Market'
import VoiceAssist from './views/VoiceAssist'
import Feedback from './views/Feedback'
import Community from './views/Community'
import Quests from './views/Quests'
import Profile from './views/Profile'
import Admin from './views/Admin'
import './ui/styles.css'

const router = createBrowserRouter([
	{
		path: '/',
		element: <App />,
		children: [
			{ index: true, element: <SoilHealth /> },
			{ path: 'soil', element: <SoilHealth /> },
			{ path: 'weather', element: <Weather /> },
			{ path: 'pests', element: <PestDetect /> },
			{ path: 'market', element: <Market /> },
			{ path: 'voice', element: <VoiceAssist /> },
			{ path: 'profile', element: <Profile /> },
			{ path: 'feedback', element: <Feedback /> },
			{ path: 'community', element: <Community /> },
			{ path: 'quests', element: <Quests /> }
			,{ path: 'admin', element: <Admin /> }
		]
	}
])

createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
)
