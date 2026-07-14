import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import AnimatedPage from './components/AnimatedPage'
import Home from './pages/Home'
import Listings from './pages/Listings'
import PropertyDetail from './pages/PropertyDetail'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AgentDashboard from './pages/AgentDashboard'
import About from './pages/About'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  const location = useLocation()

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<AnimatedPage><Home /></AnimatedPage>} />
            <Route path="/listings" element={<AnimatedPage><Listings /></AnimatedPage>} />
            <Route path="/properties/:id" element={<AnimatedPage><PropertyDetail /></AnimatedPage>} />
            <Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
            <Route path="/signup" element={<AnimatedPage><Signup /></AnimatedPage>} />
            <Route path="/about" element={<AnimatedPage><About /></AnimatedPage>} />
            <Route
              path="/dashboard"
              element={
                <AnimatedPage>
                  <ProtectedRoute roles={['agent', 'admin']}>
                    <AgentDashboard />
                  </ProtectedRoute>
                </AnimatedPage>
              }
            />
            <Route path="*" element={<AnimatedPage><NotFound /></AnimatedPage>} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}
