import { Routes, Route, Navigate } from 'react-router-dom'
import DevMetricsDashboard from './pages/DevMetricsDashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DevMetricsDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}