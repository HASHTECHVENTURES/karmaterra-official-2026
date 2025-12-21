import { useEffect, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { isMaintenanceMode } from '@/services/appConfigService'

export default function MaintenanceMode({ children }: { children: React.ReactNode }) {
  const [maintenance, setMaintenance] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const isMaintenance = await isMaintenanceMode()
        setMaintenance(isMaintenance)
      } catch (error) {
        console.error('Error checking maintenance mode:', error)
      } finally {
        setLoading(false)
      }
    }

    checkMaintenance()
    // Check every 5 minutes
    const interval = setInterval(checkMaintenance, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (maintenance) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Under Maintenance</h1>
          <p className="text-gray-600 mb-6">
            We're currently performing scheduled maintenance to improve your experience.
            Please check back soon.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}


