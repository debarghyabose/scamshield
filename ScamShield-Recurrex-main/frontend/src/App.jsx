import { lazy, useEffect, useRef } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'
import RequireAuth from './components/RequireAuth'
import GuestOnly from './components/GuestOnly'
import Home from './pages/Home'
import { useAuth } from './context/AuthContext'
import { useTheme } from './context/ThemeContext'

// Everything except the landing page is code-split and loaded on demand.
const MessageScanner = lazy(() => import('./pages/MessageScanner'))
const URLScanner = lazy(() => import('./pages/URLScanner'))
const PaymentScanner = lazy(() => import('./pages/PaymentScanner'))
const ReportScam = lazy(() => import('./pages/ReportScam'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const History = lazy(() => import('./pages/History'))
const ScanDetail = lazy(() => import('./pages/ScanDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const LearnSafety = lazy(() => import('./pages/LearnSafety'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const Terms = lazy(() => import('./pages/Terms'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Login = lazy(() => import('./pages/auth/Login'))
const Signup = lazy(() => import('./pages/auth/Signup'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'))

/** Applies the theme saved in the user's profile once it loads (per account). */
function ProfileThemeSync() {
  const { profile, profileStatus } = useAuth()
  const { setTheme } = useTheme()
  const synced = useRef(null)
  useEffect(() => {
    if (profileStatus === 'ready' && profile?.user_id && synced.current !== profile.user_id) {
      synced.current = profile.user_id
      if (profile.theme) setTheme(profile.theme)
    }
  }, [profileStatus, profile, setTheme])
  return null
}

const guard = (el) => <RequireAuth>{el}</RequireAuth>

export default function App() {
  return (
    <>
      <ProfileThemeSync />
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Route>

        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/scan" element={<Navigate to="/scan/message" replace />} />
          <Route path="/scan/message" element={<MessageScanner />} />
          <Route path="/scan/url" element={<URLScanner />} />
          <Route path="/scan/payment" element={<PaymentScanner />} />
          <Route path="/learn" element={<LearnSafety />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />

          <Route path="/dashboard" element={guard(<Dashboard />)} />
          <Route path="/history" element={guard(<History />)} />
          <Route path="/history/:id" element={guard(<ScanDetail />)} />
          <Route path="/profile" element={guard(<Profile />)} />
          <Route path="/report" element={guard(<ReportScam />)} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
