import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import AnimatedPage from './components/AnimatedPage'
import ScrollProgressBar from './components/ScrollProgressBar'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import Listings from './pages/Listings'
import PropertyDetail from './pages/PropertyDetail'
import AgenciesMarketplace from './pages/AgenciesMarketplace'
import AgencyProfile from './pages/AgencyProfile'
import AgencyCompare from './pages/AgencyCompare'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AgencyRegister from './pages/AgencyRegister'
import Pricing from './pages/Pricing'
import RegistrationPending from './pages/RegistrationPending'
import AcceptInvite from './pages/AcceptInvite'
import ApplyToAgency from './pages/ApplyToAgency'
import TrialExpired from './pages/TrialExpired'
import AgentDashboard from './pages/AgentDashboard'
import About from './pages/About'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import PlatformLogin from './pages/platform/PlatformLogin'
import PlatformLayout from './pages/platform/PlatformLayout'
import PlatformDashboard from './pages/platform/PlatformDashboard'
import AgencyManagement from './pages/platform/AgencyManagement'
import AIAssistant from './components/ai/AIAssistant'

export default function App() {
  const location = useLocation()
  const isPlatformRoute = location.pathname.startsWith('/platform')

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <ScrollProgressBar />
      {!isPlatformRoute && <Navbar />}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<AnimatedPage><Home /></AnimatedPage>} />
            <Route path="/listings" element={<AnimatedPage><Listings /></AnimatedPage>} />
            <Route path="/properties/:id" element={<AnimatedPage><PropertyDetail /></AnimatedPage>} />
            <Route path="/agencies" element={<AnimatedPage><AgenciesMarketplace /></AnimatedPage>} />
            <Route path="/agencies/compare" element={<AnimatedPage><AgencyCompare /></AnimatedPage>} />
            <Route path="/agencies/:slug" element={<AnimatedPage><AgencyProfile /></AnimatedPage>} />
            <Route path="/agencies/:slug/apply" element={<AnimatedPage><ApplyToAgency /></AnimatedPage>} />
            <Route path="/accept-invite" element={<AnimatedPage><AcceptInvite /></AnimatedPage>} />
            <Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
            <Route path="/signup" element={<AnimatedPage><Signup /></AnimatedPage>} />
            <Route path="/pricing" element={<AnimatedPage><Pricing /></AnimatedPage>} />
            <Route path="/register" element={<AnimatedPage><AgencyRegister /></AnimatedPage>} />
            <Route path="/register/pending" element={<AnimatedPage><RegistrationPending /></AnimatedPage>} />
            <Route path="/trial-expired" element={<AnimatedPage><TrialExpired /></AnimatedPage>} />
            <Route path="/about" element={<AnimatedPage><About /></AnimatedPage>} />
            <Route
              path="/dashboard"
              element={
                <AnimatedPage>
                  <ProtectedRoute roles={['agent', 'agency_admin']}>
                    <AgentDashboard />
                  </ProtectedRoute>
                </AnimatedPage>
              }
            />

            <Route path="/platform/login" element={<PlatformLogin />} />
            <Route
              path="/platform"
              element={
                <ProtectedRoute roles={['super_admin']} redirectTo="/platform/login">
                  <PlatformLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<PlatformDashboard />} />
              <Route path="agencies" element={<AgencyManagement />} />
            </Route>

            <Route path="*" element={<AnimatedPage><NotFound /></AnimatedPage>} />
          </Routes>
        </AnimatePresence>
      </main>
      {!isPlatformRoute && <Footer />}
      <AIAssistant />
    </div>
  )
}
