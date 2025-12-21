import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  MessageSquare, 
  Bell, 
  Settings, 
  Image,
  Scissors,
  BarChart3,
  Sparkles,
  MessageCircle,
  HelpCircle,
  Flag,
  Building2
} from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/users', label: 'Users', icon: Users },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/blogs', label: 'Blogs', icon: BookOpen },
    { path: '/ask-karma', label: 'Ask Karma', icon: MessageSquare },
    { path: '/hair', label: 'Know Your Hair', icon: Scissors },
    { path: '/skin', label: 'Know Your Skin', icon: Sparkles },
    { path: '/notifications', label: 'Notifications', icon: Bell },
    { path: '/feedback', label: 'Feedback', icon: MessageCircle },
    { path: '/help-requests', label: 'Help Requests', icon: HelpCircle },
    { path: '/service-reports', label: 'Service Reports', icon: Flag },
    { path: '/carousel', label: 'Home Banner', icon: Image },
    { path: '/images', label: 'App Icon', icon: Image },
    { path: '/company-logos', label: 'Company Logos', icon: Building2 },
    { path: '/config', label: 'App Config', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-[#d4a574] to-[#b8956a]">
          <h1 className="text-2xl font-bold text-white">Karma Terra</h1>
          <p className="text-sm text-white/90">Admin Panel</p>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-[#d4a574] text-white font-medium shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-[#d4a574]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="pl-64">
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

