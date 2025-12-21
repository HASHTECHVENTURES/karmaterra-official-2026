import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import BlogsPage from './pages/BlogsPage'
import ImagesPage from './pages/ImagesPage'
import NotificationsPage from './pages/NotificationsPage'
import ConfigPage from './pages/ConfigPage'
import CarouselPage from './pages/CarouselPage'
import HairPage from './pages/HairPage'
import SkinPage from './pages/SkinPage'
import AskKarmaPage from './pages/AskKarmaPage'
import AnalyticsPage from './pages/AnalyticsPage'
import FeedbackPage from './pages/FeedbackPage'
import HelpRequestsPage from './pages/HelpRequestsPage'
import ServiceReportsPage from './pages/ServiceReportsPage'
import CompanyLogosPage from './pages/CompanyLogosPage'
import { Toaster } from 'sonner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Layout>
            <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/blogs" element={<BlogsPage />} />
            <Route path="/images" element={<ImagesPage />} />
            <Route path="/knowledge" element={<Navigate to="/ask-karma" replace />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="/carousel" element={<CarouselPage />} />
            <Route path="/hair" element={<HairPage />} />
            <Route path="/skin" element={<SkinPage />} />
            <Route path="/ask-karma" element={<AskKarmaPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/help-requests" element={<HelpRequestsPage />} />
            <Route path="/service-reports" element={<ServiceReportsPage />} />
            <Route path="/company-logos" element={<CompanyLogosPage />} />
            </Routes>
          </Layout>
          <Toaster position="top-right" />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App


