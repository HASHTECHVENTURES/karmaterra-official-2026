import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, ShoppingBag, FileQuestion, Target, ArrowUp, ArrowDown, X, Eye, Search, Download, Upload, ZoomIn, Copy, Grid3x3, List, Filter, BarChart3, Image as ImageIcon, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ==================== INTERFACES ====================

interface Question {
  id: string
  question_text: string
  question_type: string
  category: string
  answer_options: string[] | null
  display_order: number
  is_required: boolean
  is_active: boolean
  icon_name: string | null
  help_text: string | null
}

interface Parameter {
  id: string
  parameter_name: string
  parameter_description: string | null
  category: string
  ai_detection_instructions: string | null
  display_order: number
  is_active: boolean
  severity_levels: string[]
}

interface Product {
  id: string
  parameter_id: string
  severity_level: string
  product_name: string
  product_description: string | null
  product_link: string | null
  product_image: string | null
  display_order: number
  is_active: boolean
  is_primary: boolean
}

// ==================== MAIN COMPONENT ====================

interface RatingConfig {
  low_min: number
  low_max: number
  medium_min: number
  medium_max: number
  high_min: number
  high_max: number
}

export default function SkinPage() {
  const [activeTab, setActiveTab] = useState<'questions' | 'parameters' | 'products' | 'reports' | 'rating-config'>('questions')
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [showReportDetails, setShowReportDetails] = useState(false)
  
  // Rating configuration state
  const [ratingConfig, setRatingConfig] = useState<RatingConfig>({
    low_min: 1,
    low_max: 3,
    medium_min: 4,
    medium_max: 7,
    high_min: 8,
    high_max: 10,
  })

  // Questions state
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [showQuestionForm, setShowQuestionForm] = useState(false)

  // Parameters state
  const [editingParameter, setEditingParameter] = useState<Parameter | null>(null)
  const [showParameterForm, setShowParameterForm] = useState(false)

  // Products state
  const [selectedParameter, setSelectedParameter] = useState<string | null>(null)
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showProductForm, setShowProductForm] = useState(false)
  const [showBulkImageExtractor, setShowBulkImageExtractor] = useState(false)

  // Fetch questions
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['skin-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questionnaire_questions')
        .select('*')
        .order('display_order', { ascending: true })
      if (error) throw error
      return (data as Question[]) || []
    },
  })

  // Fetch parameters
  const { data: parameters, isLoading: parametersLoading } = useQuery({
    queryKey: ['skin-parameters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skin_analysis_parameters')
        .select('*')
        .order('display_order', { ascending: true })
      if (error) throw error
      return (data as Parameter[]) || []
    },
  })

  // View mode: 'filtered' (by parameter/severity) or 'all' (all products)
  const [productsViewMode, setProductsViewMode] = useState<'filtered' | 'all'>('filtered')

  // Fetch products (depends on selected parameter and severity)
  const { data: filteredProducts, isLoading: filteredProductsLoading } = useQuery({
    queryKey: ['skin-products-filtered', selectedParameter, selectedSeverity],
    queryFn: async () => {
      if (!selectedParameter || !selectedSeverity) return []
      const { data, error } = await supabase
        .from('skin_parameter_products')
        .select('*')
        .eq('parameter_id', selectedParameter)
        .eq('severity_level', selectedSeverity)
        .order('display_order', { ascending: true })
      if (error) throw error
      return (data as Product[]) || []
    },
    enabled: !!selectedParameter && !!selectedSeverity && productsViewMode === 'filtered',
  })

  // Fetch all products
  const { data: allProducts, isLoading: allProductsLoading } = useQuery({
    queryKey: ['skin-products-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skin_parameter_products')
        .select('*')
        .order('display_order', { ascending: true })
      if (error) throw error
      return (data as Product[]) || []
    },
    enabled: productsViewMode === 'all',
  })

  // Use the appropriate products based on view mode
  const products = productsViewMode === 'all' ? (allProducts || []) : (filteredProducts || [])
  const productsLoading = productsViewMode === 'all' ? allProductsLoading : filteredProductsLoading

  // Auto-select first parameter and severity for products tab
  useEffect(() => {
    if (activeTab === 'products' && parameters && parameters.length > 0 && !selectedParameter) {
      const firstParam = parameters[0]
      setSelectedParameter(firstParam.id)
      if (firstParam.severity_levels.length > 0) {
        setSelectedSeverity(firstParam.severity_levels[0])
      }
    }
  }, [activeTab, parameters, selectedParameter])

  // Fetch rating configuration
  const { data: storedRatingConfig } = useQuery({
    queryKey: ['skin-rating-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('skin_rating_config')
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching rating config:', error)
        return null
      }
      
      if (data?.skin_rating_config) {
        return data.skin_rating_config as RatingConfig
      }
      return null
    },
  })

  useEffect(() => {
    if (storedRatingConfig) {
      setRatingConfig(storedRatingConfig)
    }
  }, [storedRatingConfig])

  // Save rating configuration
  const saveRatingConfigMutation = useMutation({
    mutationFn: async (config: RatingConfig) => {
      // Validate ranges
      if (config.low_min < 1 || config.low_max > 10 || 
          config.medium_min < 1 || config.medium_max > 10 ||
          config.high_min < 1 || config.high_max > 10) {
        throw new Error('All values must be between 1 and 10')
      }
      
      if (config.low_max >= config.medium_min || config.medium_max >= config.high_min) {
        throw new Error('Ranges must not overlap. Low max must be less than Medium min, and Medium max must be less than High min')
      }

      // Get existing config
      const { data: existingConfig } = await supabase
        .from('app_config')
        .select('id, skin_rating_config')
        .maybeSingle()

      if (existingConfig?.id) {
        const { error } = await supabase
          .from('app_config')
          .update({ skin_rating_config: config })
          .eq('id', existingConfig.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('app_config')
          .insert([{ skin_rating_config: config }])
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success('Rating configuration saved successfully')
      queryClient.invalidateQueries({ queryKey: ['skin-rating-config'] })
      // Also invalidate reports to refresh with new config
      queryClient.invalidateQueries({ queryKey: ['skin-reports'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save rating configuration')
    },
  })

  // Fetch skin reports - FIXED: Use join to avoid N+1 queries and database-level search
  const { data: reports, isLoading: reportsLoading, error: reportsError } = useQuery({
    queryKey: ['skin-reports', searchTerm],
    queryFn: async () => {
      try {
        // First, fetch all analysis history records
        const { data: analysisData, error: analysisError } = await supabase
          .from('analysis_history')
          .select('*')
          .eq('analysis_type', 'skin')
          .order('created_at', { ascending: false })

        if (analysisError) {
          console.error('Error fetching skin reports:', analysisError)
          throw analysisError
        }

        if (!analysisData || analysisData.length === 0) {
          return []
        }

        // Get unique user IDs
        const userIds = [...new Set(analysisData.map((item: any) => item.user_id).filter(Boolean))]

        // Fetch user profiles in batch
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)

        if (profilesError) {
          console.error('Error fetching user profiles:', profilesError)
          // Continue even if profiles fail - we'll just show user_id
        }

        // Create a map of user_id to profile
        const profilesMap = new Map()
        if (profilesData) {
          profilesData.forEach((profile: any) => {
            profilesMap.set(profile.id, profile)
          })
        }

        // Combine analysis data with user profiles
        let reportsWithUsers = analysisData.map((item: any) => ({
          ...item,
          user: profilesMap.get(item.user_id) || null
        }))

        // Filter by search term if provided
        if (searchTerm) {
          reportsWithUsers = reportsWithUsers.filter((item: any) => {
            const user = item.user
            return user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   item.user_id?.toLowerCase().includes(searchTerm.toLowerCase())
          })
        }

        return reportsWithUsers
      } catch (error: any) {
        console.error('Error in skin reports query:', error)
        toast.error('Failed to load skin reports: ' + (error.message || 'Unknown error'))
        return []
      }
    },
    enabled: activeTab === 'reports',
  })

  const currentParameter = parameters?.find((p) => p.id === selectedParameter)
  const severityLevels = currentParameter?.severity_levels || ['High', 'Medium', 'Low']

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('analysis_history').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-reports'] })
      toast.success('Report deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete report')
    },
  })

  // Download report function as PDF
  const handleDownloadReport = async (analysis: any) => {
    try {
      // Dynamically import jsPDF
      const { default: jsPDF } = await import('jspdf')
      
      const doc = new jsPDF()
      const report = analysis.analysis_result
      const severity = report?.result?.overallSeverity || 'N/A'
      
      let yPos = 20
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 20
      const maxWidth = pageWidth - (margin * 2)
      
      // Title
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('Skin Analysis Report', margin, yPos)
      yPos += 10
      
      // User Information
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('User Information', margin, yPos)
      yPos += 7
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Name: ${analysis.user?.full_name || 'N/A'}`, margin, yPos)
      yPos += 6
      doc.text(`Email: ${analysis.user?.email || 'N/A'}`, margin, yPos)
      yPos += 6
      doc.text(`Date: ${new Date(analysis.created_at).toLocaleString()}`, margin, yPos)
      yPos += 6
      doc.text(`Overall Severity: ${severity}`, margin, yPos)
      yPos += 10
      
      // Helper function to load image and add to PDF
      const addImageToPDF = (imageUrl: string, x: number, y: number, width: number, height: number, label: string): Promise<number> => {
        return new Promise((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            try {
              doc.addImage(img, 'JPEG', x, y, width, height)
              doc.setFontSize(8)
              doc.setFont('helvetica', 'normal')
              doc.text(label, x + width / 2, y + height + 5, { align: 'center' })
              resolve(y + height + 10)
            } catch (error) {
              console.error('Error adding image to PDF:', error)
              resolve(y)
            }
          }
          img.onerror = () => {
            console.error('Failed to load image:', imageUrl)
            resolve(y)
          }
          img.src = imageUrl
        })
      }
      
      // Analysis Images
      if (report?.faceImages && report.faceImages.length > 0) {
        // Check if we need a new page
        if (yPos > 200) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Analysis Images', margin, yPos)
        yPos += 10
        
        const imageLabels = ['Front Face', 'Right Side', 'Left Side']
        const imagesPerRow = report.faceImages.length <= 2 ? report.faceImages.length : 3
        const imageWidth = (maxWidth - (imagesPerRow - 1) * 5) / imagesPerRow
        const imageHeight = imageWidth * 0.75 // Aspect ratio
        
        let currentX = margin
        let maxY = yPos
        
        // Add images in rows
        for (let i = 0; i < report.faceImages.length; i++) {
          // Check if we need a new page
          if (yPos > 200) {
            doc.addPage()
            yPos = 20
            currentX = margin
          }
          
          const label = imageLabels[i] || `Image ${i + 1}`
          const newY = await addImageToPDF(report.faceImages[i], currentX, yPos, imageWidth, imageHeight, label)
          maxY = Math.max(maxY, newY)
          
          currentX += imageWidth + 5
          
          // Move to next row if needed
          if ((i + 1) % imagesPerRow === 0) {
            yPos = maxY + 5
            currentX = margin
            maxY = yPos
          }
        }
        
        yPos = maxY + 10
      }
      
      // Summary
      if (report?.result?.summary) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Summary', margin, yPos)
        yPos += 7
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        const summaryLines = doc.splitTextToSize(report.result.summary, maxWidth)
        doc.text(summaryLines, margin, yPos)
        yPos += summaryLines.length * 5 + 5
      }
      
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }
      
      // Parameters Analysis
      if (report?.result?.parameters && Object.keys(report.result.parameters).length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Parameter Analysis', margin, yPos)
        yPos += 7
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        
        Object.entries(report.result.parameters).forEach(([key, value]: [string, any]) => {
          // Check if we need a new page
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }
          
          doc.setFont('helvetica', 'bold')
          const keyLines = doc.splitTextToSize(key, maxWidth)
          doc.text(keyLines, margin, yPos)
          yPos += keyLines.length * 5
          
          doc.setFont('helvetica', 'normal')
          if (value.severity) {
            doc.text(`Severity: ${value.severity}`, margin, yPos)
            yPos += 6
          }
          if (value.description) {
            const descLines = doc.splitTextToSize(value.description, maxWidth)
            doc.text(descLines, margin, yPos)
            yPos += descLines.length * 5
          }
          if (value.score !== undefined) {
            doc.text(`Score: ${value.score}`, margin, yPos)
            yPos += 6
          }
          yPos += 5
        })
      }
      
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }
      
      // Routines
      if (report?.result?.routines) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Recommended Routines', margin, yPos)
        yPos += 7
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        
        if (report.result.routines.morning && report.result.routines.morning.length > 0) {
          doc.setFont('helvetica', 'bold')
          doc.text('Morning Routine:', margin, yPos)
          yPos += 6
          
          doc.setFont('helvetica', 'normal')
          report.result.routines.morning.forEach((routine: string) => {
            if (yPos > 250) {
              doc.addPage()
              yPos = 20
            }
            const routineLines = doc.splitTextToSize(`• ${routine}`, maxWidth)
            doc.text(routineLines, margin + 5, yPos)
            yPos += routineLines.length * 5
          })
          yPos += 3
        }
        
        if (report.result.routines.evening && report.result.routines.evening.length > 0) {
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }
          
          doc.setFont('helvetica', 'bold')
          doc.text('Evening Routine:', margin, yPos)
          yPos += 6
          
          doc.setFont('helvetica', 'normal')
          report.result.routines.evening.forEach((routine: string) => {
            if (yPos > 250) {
              doc.addPage()
              yPos = 20
            }
            const routineLines = doc.splitTextToSize(`• ${routine}`, maxWidth)
            doc.text(routineLines, margin + 5, yPos)
            yPos += routineLines.length * 5
          })
        }
      }
      
      // Save PDF
      const fileName = `skin-report-${analysis.id}-${new Date(analysis.created_at).toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      toast.success('Report downloaded as PDF successfully')
    } catch (error: any) {
      console.error('PDF generation error:', error)
      toast.error('Failed to download report: ' + error.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="mb-8"><h1 className="text-3xl font-bold text-gray-900 mb-2">Know Your Skin</h1><p className="text-gray-600">Manage and view Know Your Skin</p></div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'questions'
                  ? 'border-[#d4a574] text-[#d4a574]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileQuestion className="w-5 h-5 inline mr-2" />
              Questions
            </button>
            <button
              onClick={() => setActiveTab('parameters')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'parameters'
                  ? 'border-[#d4a574] text-[#d4a574]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Target className="w-5 h-5 inline mr-2" />
              Parameters
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'products'
                  ? 'border-[#d4a574] text-[#d4a574]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ShoppingBag className="w-5 h-5 inline mr-2" />
              Products
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'reports'
                  ? 'border-[#d4a574] text-[#d4a574]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Eye className="w-5 h-5 inline mr-2" />
              Reports
            </button>
            <button
              onClick={() => setActiveTab('rating-config')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'rating-config'
                  ? 'border-[#d4a574] text-[#d4a574]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-5 h-5 inline mr-2" />
              Rating Config
            </button>
          </nav>
        </div>
      </div>

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <QuestionsTab
          questions={questions || []}
          isLoading={questionsLoading}
          editingQuestion={editingQuestion}
          showQuestionForm={showQuestionForm}
          onEdit={(q) => {
            setEditingQuestion(q)
            setShowQuestionForm(true)
          }}
          onAdd={() => {
            setEditingQuestion(null)
            setShowQuestionForm(true)
          }}
          onClose={() => {
            setShowQuestionForm(false)
            setEditingQuestion(null)
          }}
          onSuccess={() => {
            setShowQuestionForm(false)
            setEditingQuestion(null)
            queryClient.invalidateQueries({ queryKey: ['skin-questions'] })
          }}
        />
      )}

      {/* Parameters Tab */}
      {activeTab === 'parameters' && (
        <ParametersTab
          parameters={parameters || []}
          isLoading={parametersLoading}
          editingParameter={editingParameter}
          showParameterForm={showParameterForm}
          onEdit={(p) => {
            setEditingParameter(p)
            setShowParameterForm(true)
          }}
          onAdd={() => {
            setEditingParameter(null)
            setShowParameterForm(true)
          }}
          onClose={() => {
            setShowParameterForm(false)
            setEditingParameter(null)
          }}
          onSuccess={() => {
            setShowParameterForm(false)
            setEditingParameter(null)
            queryClient.invalidateQueries({ queryKey: ['skin-parameters'] })
          }}
        />
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Skin Analysis Reports</h2>
              <p className="text-sm text-gray-500 mt-1">
                Total Reports: {reportsLoading ? 'Loading...' : (reports?.length || 0)}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by user name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a574] focus:border-transparent"
              />
            </div>
          </div>

          {reportsError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">Error loading reports</p>
              <p className="text-sm text-red-600 mt-1">
                {reportsError instanceof Error ? reportsError.message : 'Unknown error occurred'}
              </p>
            </div>
          )}

          {reportsLoading ? (
            <div className="text-center py-12">Loading reports...</div>
          ) : reports && reports.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Summary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((analysis: any) => {
                    const report = analysis.analysis_result
                    const severity = report?.result?.overallSeverity || 'N/A'
                    const summary = report?.result?.summary || 'No summary available'
                    
                    return (
                      <tr key={analysis.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {analysis.user?.full_name || analysis.user?.email || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            severity === 'Low' ? 'bg-[#d4a574]/10 text-[#b8956a]' :
                            severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            severity === 'High' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {severity}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-md truncate">{summary}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(analysis.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setSelectedReport(analysis)
                                setShowReportDetails(true)
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadReport(analysis)}
                              className="text-[#d4a574] hover:text-[#b8956a]"
                              title="Download Report"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
                                  deleteReportMutation.mutate(analysis.id)
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Report"
                              disabled={deleteReportMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
              <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No skin analysis reports found</p>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500">
            Showing {reports?.length || 0} report(s)
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <ProductsTab
          parameters={parameters || []}
          products={products || []}
          isLoading={productsLoading}
          selectedParameter={selectedParameter}
          selectedSeverity={selectedSeverity}
          severityLevels={severityLevels}
          currentParameter={currentParameter}
          editingProduct={editingProduct}
          showProductForm={showProductForm}
          onParameterChange={(paramId) => {
            setSelectedParameter(paramId)
            const param = parameters?.find((p) => p.id === paramId)
            if (param && param.severity_levels.length > 0) {
              setSelectedSeverity(param.severity_levels[0])
            }
          }}
          onSeverityChange={(severity) => setSelectedSeverity(severity)}
          onEdit={(p) => {
            setEditingProduct(p)
            setShowProductForm(true)
          }}
          onAdd={() => {
            setEditingProduct(null)
            setShowProductForm(true)
          }}
          onClose={() => {
            setShowProductForm(false)
            setEditingProduct(null)
          }}
          onSuccess={() => {
            setShowProductForm(false)
            setEditingProduct(null)
            queryClient.invalidateQueries({ queryKey: ['skin-products'] })
            queryClient.invalidateQueries({ queryKey: ['skin-products-filtered'] })
            queryClient.invalidateQueries({ queryKey: ['skin-products-all'] })
          }}
          productsViewMode={productsViewMode}
          onViewModeChange={setProductsViewMode}
          showBulkImageExtractor={showBulkImageExtractor}
          onBulkImageExtractorOpen={() => setShowBulkImageExtractor(true)}
          onBulkImageExtractorClose={() => setShowBulkImageExtractor(false)}
        />
      )}

      {/* Rating Configuration Tab */}
      {activeTab === 'rating-config' && (
        <RatingConfigTab
          ratingConfig={ratingConfig}
          onConfigChange={setRatingConfig}
          onSave={() => saveRatingConfigMutation.mutate(ratingConfig)}
          isSaving={saveRatingConfigMutation.isPending}
        />
      )}

      {/* Report Details Modal */}
      {showReportDetails && selectedReport && (
        <SkinReportDetailsModal
          analysis={selectedReport}
          ratingConfig={ratingConfig}
          onClose={() => {
            setShowReportDetails(false)
            setSelectedReport(null)
          }}
        />
      )}
    </div>
  )
}

// ==================== REPORT MODAL ====================

// Helper function to categorize rating using config
const getRatingCategory = (rating: number, config: RatingConfig): { label: string; color: string; bgColor: string } => {
  if (rating >= config.low_min && rating <= config.low_max) {
    return { label: `Low (${config.low_min}-${config.low_max})`, color: 'text-green-700', bgColor: 'bg-green-100' }
  } else if (rating >= config.medium_min && rating <= config.medium_max) {
    return { label: `Medium (${config.medium_min}-${config.medium_max})`, color: 'text-yellow-700', bgColor: 'bg-yellow-100' }
  } else if (rating >= config.high_min && rating <= config.high_max) {
    return { label: `High (${config.high_min}-${config.high_max})`, color: 'text-red-700', bgColor: 'bg-red-100' }
  }
  return { label: 'N/A', color: 'text-gray-700', bgColor: 'bg-gray-100' }
}

function SkinReportDetailsModal({
  analysis,
  ratingConfig,
  onClose,
}: {
  analysis: any
  ratingConfig: RatingConfig
  onClose: () => void
}) {
  const report = analysis.analysis_result
  const severity = report?.result?.overallSeverity || 'N/A'
  
  // Calculate rating statistics using config
  const parameters = report?.result?.parameters || []
  const ratingStats = {
    low: parameters.filter((p: any) => p.rating >= ratingConfig.low_min && p.rating <= ratingConfig.low_max).length,
    medium: parameters.filter((p: any) => p.rating >= ratingConfig.medium_min && p.rating <= ratingConfig.medium_max).length,
    high: parameters.filter((p: any) => p.rating >= ratingConfig.high_min && p.rating <= ratingConfig.high_max).length,
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Skin Analysis Report</h2>
            <p className="text-sm text-gray-500 mt-1">
              {analysis.user?.full_name || analysis.user?.email || 'Unknown User'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm text-gray-500">Date:</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(analysis.created_at).toLocaleString()}
              </span>
              <span className={`px-3 py-1 rounded text-sm font-medium ${
                severity === 'Low' ? 'bg-[#d4a574]/10 text-[#b8956a]' :
                severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                severity === 'High' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {severity}
              </span>
            </div>
          </div>

          {/* Analysis Images */}
          {report?.faceImages && report.faceImages.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Images</h3>
              <div className={`grid grid-cols-1 ${report.faceImages.length === 1 ? 'sm:grid-cols-1 max-w-md mx-auto' : report.faceImages.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
                {report.faceImages.map((image: string, index: number) => (
                  <div key={index} className="text-center">
                    <img 
                      src={image} 
                      alt={['Front Face', 'Right Side', 'Left Side'][index] || `Image ${index + 1}`} 
                      className="rounded-lg shadow-sm border border-gray-100-md border border-gray-200 aspect-square object-cover w-full" 
                      onError={(e) => {
                        console.error('Image failed to load:', image);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <p className="text-sm font-semibold text-gray-600 mt-2">
                      {['Front Face', 'Right Side', 'Left Side'][index] || `Image ${index + 1}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report?.result?.summary && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Summary</h3>
              <p className="text-gray-600">{report.result.summary}</p>
            </div>
          )}

          {/* Rating Statistics Summary */}
          {parameters.length > 0 && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Rating Distribution
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{ratingStats.low}</div>
                  <div className="text-xs text-green-600 mt-1">Low ({ratingConfig.low_min}-{ratingConfig.low_max})</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-700">{ratingStats.medium}</div>
                  <div className="text-xs text-yellow-600 mt-1">Medium ({ratingConfig.medium_min}-{ratingConfig.medium_max})</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-red-200">
                  <div className="text-2xl font-bold text-red-700">{ratingStats.high}</div>
                  <div className="text-xs text-red-600 mt-1">High ({ratingConfig.high_min}-{ratingConfig.high_max})</div>
                </div>
              </div>
            </div>
          )}

          {report?.result?.parameters && report.result.parameters.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Parameters Analysis</h3>
              <div className="space-y-3">
                {report.result.parameters.map((param: any, index: number) => {
                  const ratingCategory = param.rating ? getRatingCategory(param.rating, ratingConfig) : null
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{param.category}</h4>
                        <div className="flex items-center gap-2">
                          {param.rating && ratingCategory && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${ratingCategory.bgColor} ${ratingCategory.color}`}>
                              {param.rating}/10 - {ratingCategory.label}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            param.severity === 'Low' ? 'bg-[#d4a574]/10 text-[#b8956a]' :
                            param.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            param.severity === 'High' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {param.severity}
                          </span>
                        </div>
                      </div>
                      {param.description && (
                        <p className="text-sm text-gray-600">{param.description}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {report?.result?.routine && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Routine</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {report.result.routine.morning && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Morning Routine</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      {report.result.routine.morning.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {report.result.routine.evening && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Evening Routine</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      {report.result.routine.evening.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== QUESTIONS TAB ====================

function QuestionsTab({
  questions,
  isLoading,
  editingQuestion,
  showQuestionForm,
  onEdit,
  onAdd,
  onClose,
  onSuccess,
}: {
  questions: Question[]
  isLoading: boolean
  editingQuestion: Question | null
  showQuestionForm: boolean
  onEdit: (q: Question) => void
  onAdd: () => void
  onClose: () => void
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase
        .from('questionnaire_questions')
        .update({ display_order: newOrder })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-questions'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('questionnaire_questions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-questions'] })
      toast.success('Question deleted successfully')
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('questionnaire_questions')
        .update({ is_active: !isActive })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-questions'] })
      toast.success('Question status updated')
    },
  })

  const handleMoveUp = (index: number) => {
    if (index === 0 || !questions) return
    const question = questions[index]
    const prevQuestion = questions[index - 1]
    updateOrderMutation.mutate({ id: question.id, newOrder: prevQuestion.display_order })
    updateOrderMutation.mutate({ id: prevQuestion.id, newOrder: question.display_order })
  }

  const handleMoveDown = (index: number) => {
    if (!questions || index === questions.length - 1) return
    const question = questions[index]
    const nextQuestion = questions[index + 1]
    updateOrderMutation.mutate({ id: question.id, newOrder: nextQuestion.display_order })
    updateOrderMutation.mutate({ id: nextQuestion.id, newOrder: question.display_order })
  }

  // Drag and drop handlers
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id)
      const newIndex = questions.findIndex((q) => q.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedQuestions = arrayMove(questions, oldIndex, newIndex)
        
        // Update display_order for all items sequentially
        const updatePromises = reorderedQuestions.map((question, index) => {
          const newOrder = index + 1
          return supabase
            .from('questionnaire_questions')
            .update({ display_order: newOrder })
            .eq('id', question.id)
        })
        
        Promise.all(updatePromises)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['skin-questions'] })
            toast.success('Questions reordered successfully')
          })
          .catch((error) => {
            console.error('Error reordering questions:', error)
            toast.error('Failed to reorder questions')
          })
      }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Skin Questionnaire Questions</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90"
        >
          <Plus className="w-5 h-5" />
          Add Question
        </button>
      </div>

      {showQuestionForm && (
        <QuestionForm question={editingQuestion} onClose={onClose} onSuccess={onSuccess} />
      )}

      {isLoading ? (
        <div className="text-center py-12">Loading questions...</div>
      ) : questions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
          <FileQuestion className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No questions configured yet</p>
          <button onClick={onAdd} className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90">
            Add First Question
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                <tbody className="bg-white divide-y divide-gray-200">
                  {questions.map((question, index) => (
                    <SortableQuestionRow
                      key={question.id}
                      question={question}
                      index={index}
                      onEdit={onEdit}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onToggleActive={(id, isActive) => toggleActiveMutation.mutate({ id, isActive })}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      totalQuestions={questions.length}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
      )}
    </div>
  )
}

// ==================== PARAMETERS TAB ====================

function ParametersTab({
  parameters,
  isLoading,
  editingParameter,
  showParameterForm,
  onEdit,
  onAdd,
  onClose,
  onSuccess,
}: {
  parameters: Parameter[]
  isLoading: boolean
  editingParameter: Parameter | null
  showParameterForm: boolean
  onEdit: (p: Parameter) => void
  onAdd: () => void
  onClose: () => void
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase
        .from('skin_analysis_parameters')
        .update({ display_order: newOrder })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-parameters'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('skin_analysis_parameters').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-parameters'] })
      toast.success('Parameter deleted successfully')
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('skin_analysis_parameters')
        .update({ is_active: !isActive })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-parameters'] })
      toast.success('Parameter status updated')
    },
  })

  const handleMoveUp = (index: number) => {
    if (index === 0 || !parameters) return
    const param = parameters[index]
    const prevParam = parameters[index - 1]
    updateOrderMutation.mutate({ id: param.id, newOrder: prevParam.display_order })
    updateOrderMutation.mutate({ id: prevParam.id, newOrder: param.display_order })
  }

  const handleMoveDown = (index: number) => {
    if (!parameters || index === parameters.length - 1) return
    const param = parameters[index]
    const nextParam = parameters[index + 1]
    updateOrderMutation.mutate({ id: param.id, newOrder: nextParam.display_order })
    updateOrderMutation.mutate({ id: nextParam.id, newOrder: param.display_order })
  }

  // Drag and drop handlers
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = parameters.findIndex((p) => p.id === active.id)
      const newIndex = parameters.findIndex((p) => p.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedParameters = arrayMove(parameters, oldIndex, newIndex)
        
        // Update display_order for all items sequentially
        const updatePromises = reorderedParameters.map((parameter, index) => {
          const newOrder = index + 1
          return supabase
            .from('skin_analysis_parameters')
            .update({ display_order: newOrder })
            .eq('id', parameter.id)
        })
        
        Promise.all(updatePromises)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['skin-parameters'] })
            toast.success('Parameters reordered successfully')
          })
          .catch((error) => {
            console.error('Error reordering parameters:', error)
            toast.error('Failed to reorder parameters')
          })
      }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Skin Analysis Parameters</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90"
        >
          <Plus className="w-5 h-5" />
          Add Parameter
        </button>
      </div>

      {showParameterForm && (
        <ParameterForm parameter={editingParameter} onClose={onClose} onSuccess={onSuccess} />
      )}

      {isLoading ? (
        <div className="text-center py-12">Loading parameters...</div>
      ) : parameters.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No parameters configured yet</p>
          <button onClick={onAdd} className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90">
            Add First Parameter
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parameter Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <SortableContext items={parameters.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parameters.map((parameter, index) => (
                    <SortableParameterRow
                      key={parameter.id}
                      parameter={parameter}
                      index={index}
                      onEdit={onEdit}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onToggleActive={(id, isActive) => toggleActiveMutation.mutate({ id, isActive })}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      totalParameters={parameters.length}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
      )}
    </div>
  )
}

// ==================== SORTABLE ROW COMPONENTS ====================

interface SortableQuestionRowProps {
  question: Question
  index: number
  onEdit: (q: Question) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string, isActive: boolean) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  totalQuestions: number
}

function SortableQuestionRow({
  question,
  index,
  onEdit,
  onDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  totalQuestions,
}: SortableQuestionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${!question.is_active ? 'opacity-50' : ''} ${isDragging ? 'bg-blue-50' : ''}`}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="p-1 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            title="Drag to reorder"
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
              title="Move up"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-900 min-w-[2rem] text-center">
              {question.display_order}
            </span>
            <button
              onClick={() => onMoveDown(index)}
              disabled={index === totalQuestions - 1}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
              title="Move down"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm font-medium text-gray-900">{question.question_text}</div>
        {question.answer_options && (
          <div className="text-xs text-gray-500 mt-1">{question.answer_options.length} option(s)</div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {question.question_type.replace('_', ' ')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{question.category}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={() => onToggleActive(question.id, question.is_active)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            question.is_active ? 'bg-[#d4a574]/10 text-[#b8956a]' : 'bg-gray-100 text-gray-800'
          }`}
        >
          {question.is_active ? 'Active' : 'Inactive'}
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(question)} className="text-blue-600 hover:text-blue-900 transition-colors">
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this question?')) {
                onDelete(question.id)
              }
            }}
            className="text-red-600 hover:text-red-900 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

interface SortableParameterRowProps {
  parameter: Parameter
  index: number
  onEdit: (p: Parameter) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string, isActive: boolean) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  totalParameters: number
}

function SortableParameterRow({
  parameter,
  index,
  onEdit,
  onDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  totalParameters,
}: SortableParameterRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: parameter.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${!parameter.is_active ? 'opacity-50' : ''} ${isDragging ? 'bg-blue-50' : ''}`}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="p-1 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            title="Drag to reorder"
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
              title="Move up"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-900 min-w-[2rem] text-center">
              {parameter.display_order}
            </span>
            <button
              onClick={() => onMoveDown(index)}
              disabled={index === totalParameters - 1}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
              title="Move down"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm font-medium text-gray-900">{parameter.parameter_name}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{parameter.category}</td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-500 max-w-md truncate">
          {parameter.parameter_description || '-'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={() => onToggleActive(parameter.id, parameter.is_active)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            parameter.is_active ? 'bg-[#d4a574]/10 text-[#b8956a]' : 'bg-gray-100 text-gray-800'
          }`}
        >
          {parameter.is_active ? 'Active' : 'Inactive'}
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(parameter)} className="text-blue-600 hover:text-blue-900 transition-colors">
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this parameter?')) {
                onDelete(parameter.id)
              }
            }}
            className="text-red-600 hover:text-red-900 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ==================== PRODUCTS TAB ====================

function ProductsTab({
  parameters,
  products,
  isLoading,
  selectedParameter,
  selectedSeverity,
  severityLevels,
  currentParameter,
  editingProduct,
  showProductForm,
  productsViewMode,
  onViewModeChange,
  onParameterChange,
  onSeverityChange,
  onEdit,
  onAdd,
  onClose,
  onSuccess,
  showBulkImageExtractor,
  onBulkImageExtractorOpen,
  onBulkImageExtractorClose,
}: {
  parameters: Parameter[]
  products: Product[]
  isLoading: boolean
  selectedParameter: string | null
  selectedSeverity: string | null
  severityLevels: string[]
  currentParameter: Parameter | undefined
  editingProduct: Product | null
  showProductForm: boolean
  productsViewMode: 'filtered' | 'all'
  onViewModeChange: (mode: 'filtered' | 'all') => void
  onParameterChange: (paramId: string) => void
  onSeverityChange: (severity: string) => void
  onEdit: (p: Product) => void
  onAdd: () => void
  onClose: () => void
  onSuccess: () => void
  showBulkImageExtractor: boolean
  onBulkImageExtractorOpen: () => void
  onBulkImageExtractorClose: () => void
}) {
  const queryClient = useQueryClient()
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [showPreview, setShowPreview] = useState<Product | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterParameter, setFilterParameter] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('skin_parameter_products').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-products'] })
      queryClient.invalidateQueries({ queryKey: ['skin-products-filtered'] })
      queryClient.invalidateQueries({ queryKey: ['skin-products-all'] })
      toast.success('Product deleted successfully')
      setSelectedProducts(new Set()) // Clear selection after delete
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('skin_parameter_products').delete().in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-products'] })
      queryClient.invalidateQueries({ queryKey: ['skin-products-filtered'] })
      queryClient.invalidateQueries({ queryKey: ['skin-products-all'] })
      toast.success(`Deleted ${selectedProducts.size} product(s) successfully`)
      setSelectedProducts(new Set())
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete products')
    },
  })

  const bulkToggleActiveMutation = useMutation({
    mutationFn: async ({ ids, isActive }: { ids: string[]; isActive: boolean }) => {
      const { error } = await supabase
        .from('skin_parameter_products')
        .update({ is_active: !isActive })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-products'] })
      toast.success(`Updated ${selectedProducts.size} product(s)`)
      setSelectedProducts(new Set())
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update products')
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('skin_parameter_products')
        .update({ is_active: !isActive })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-products'] })
      queryClient.invalidateQueries({ queryKey: ['skin-products-filtered'] })
      queryClient.invalidateQueries({ queryKey: ['skin-products-all'] })
      toast.success('Product status updated')
    },
  })

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase
        .from('skin_parameter_products')
        .update({ display_order: newOrder })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-products'] })
      queryClient.invalidateQueries({ queryKey: ['skin-products-filtered'] })
      queryClient.invalidateQueries({ queryKey: ['skin-products-all'] })
    },
  })

  const handleMoveUp = (index: number) => {
    if (index === 0 || !products) return
    const product = products[index]
    const prevProduct = products[index - 1]
    updateOrderMutation.mutate({ id: product.id, newOrder: prevProduct.display_order })
    updateOrderMutation.mutate({ id: prevProduct.id, newOrder: product.display_order })
  }

  const handleMoveDown = (index: number) => {
    if (!products || index === products.length - 1) return
    const product = products[index]
    const nextProduct = products[index + 1]
    updateOrderMutation.mutate({ id: product.id, newOrder: nextProduct.display_order })
    updateOrderMutation.mutate({ id: nextProduct.id, newOrder: product.display_order })
  }

  const duplicateMutation = useMutation({
    mutationFn: async (product: Product) => {
      const { data, error } = await supabase
        .from('skin_parameter_products')
        .insert({
          parameter_id: product.parameter_id,
          severity_level: product.severity_level,
          product_name: `${product.product_name} (Copy)`,
          product_description: product.product_description,
          product_link: product.product_link,
          product_image: product.product_image,
          display_order: products.length + 1,
          is_active: false, // Start as inactive
          is_primary: false,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-products'] })
      queryClient.invalidateQueries({ queryKey: ['skin-products-filtered'] })
      queryClient.invalidateQueries({ queryKey: ['skin-products-all'] })
      toast.success('Product duplicated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to duplicate product')
    },
  })

  // Calculate stats
  const stats = {
    total: products.length,
    active: products.filter(p => p.is_active).length,
    inactive: products.filter(p => !p.is_active).length,
  }

  // Get all unique severity levels from products
  const allSeverityLevels = Array.from(new Set(products.map(p => p.severity_level))).sort()

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.product_description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && product.is_active) ||
      (filterStatus === 'inactive' && !product.is_active)
    
    const matchesParameter = filterParameter === 'all' || product.parameter_id === filterParameter
    
    const matchesSeverity = filterSeverity === 'all' || product.severity_level === filterSeverity
    
    return matchesSearch && matchesStatus && matchesParameter && matchesSeverity
  })

  // Get parameter name for a product
  const getParameterName = (parameterId: string) => {
    return parameters.find(p => p.id === parameterId)?.parameter_name || 'Unknown'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Product Suggestions</h2>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 p-1">
            <button
              onClick={() => onViewModeChange('filtered')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                productsViewMode === 'filtered'
                  ? 'bg-[#d4a574] text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Filtered
            </button>
            <button
              onClick={() => onViewModeChange('all')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                productsViewMode === 'all'
                  ? 'bg-[#d4a574] text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              All Products
            </button>
          </div>
          <button
            onClick={onBulkImageExtractorOpen}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Upload className="w-5 h-5" />
            Extract Images from PDF
          </button>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Quick Stats Dashboard */}
      {selectedParameter && selectedSeverity && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Products</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#d4a574] font-medium">Active</p>
                <p className="text-2xl font-bold text-green-900">{stats.active}</p>
              </div>
              <ShoppingBag className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Inactive</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inactive}</p>
              </div>
              <X className="w-8 h-8 text-gray-500" />
            </div>
          </div>
        </div>
      )}

      {/* Parameter and Severity Selectors - Only show in filtered mode */}
      {productsViewMode === 'filtered' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Parameter</label>
              <select
                value={selectedParameter || ''}
                onChange={(e) => onParameterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">-- Select Parameter --</option>
                {parameters.map((param) => (
                  <option key={param.id} value={param.id}>
                    {param.parameter_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Level</label>
              <select
                value={selectedSeverity || ''}
                onChange={(e) => onSeverityChange(e.target.value)}
                disabled={!selectedParameter}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
              >
                <option value="">-- Select Level --</option>
                {severityLevels.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {showProductForm && (
        <ProductForm
          product={editingProduct}
          parameters={parameters || []}
          initialParameterId={selectedParameter}
          initialSeverityLevel={selectedSeverity}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}

      {showBulkImageExtractor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Bulk Image Extractor</h2>
            <p className="text-gray-600 mb-4">This feature is coming soon.</p>
            <button
              onClick={onBulkImageExtractorClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}



      {productsViewMode === 'filtered' && (!selectedParameter || !selectedSeverity) ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Please select a parameter and level to manage products</p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12">Loading products...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {/* Header with Search, Filters, and View Toggle */}
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {productsViewMode === 'all' 
                      ? 'All Products' 
                      : `Products for ${currentParameter?.parameter_name} - ${selectedSeverity} Level`}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {filteredProducts.length} of {products.length} product(s) shown
                    {selectedProducts.size > 0 && (
                      <span className="ml-2 text-blue-600 font-medium">
                        ({selectedProducts.size} selected)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* View Toggle */}
                  <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-300 p-1">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-2 rounded ${viewMode === 'table' ? 'bg-[#d4a574]/10 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                      title="Table View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#d4a574]/10 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                      title="Grid View"
                    >
                      <Grid3x3 className="w-4 h-4" />
                    </button>
                  </div>
                  {selectedProducts.size > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const selected = Array.from(selectedProducts)
                          const allActive = selected.every(id => 
                            products.find(p => p.id === id)?.is_active
                          )
                          bulkToggleActiveMutation.mutate({
                            ids: selected,
                            isActive: allActive
                          })
                        }}
                        disabled={bulkToggleActiveMutation.isPending}
                        className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                      >
                        {bulkToggleActiveMutation.isPending ? 'Updating...' : 'Toggle Active'}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${selectedProducts.size} product(s)?`)) {
                            bulkDeleteMutation.mutate(Array.from(selectedProducts))
                          }
                        }}
                        disabled={bulkDeleteMutation.isPending}
                        className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete (${selectedProducts.size})`}
                      </button>
                      <button
                        onClick={() => setSelectedProducts(new Set())}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Search and Filters */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search products by name or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a574] focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a574] focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive Only</option>
                    </select>
                  </div>
                </div>
                
                {/* Additional filters for "All Products" view */}
                {productsViewMode === 'all' && (
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-5 h-5 text-gray-500" />
                      <select
                        value={filterParameter}
                        onChange={(e) => setFilterParameter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a574] focus:border-transparent"
                      >
                        <option value="all">All Parameters</option>
                        {parameters.map((param) => (
                          <option key={param.id} value={param.id}>
                            {param.parameter_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a574] focus:border-transparent"
                      >
                        <option value="all">All Levels</option>
                        {allSeverityLevels.map((severity) => (
                          <option key={severity} value={severity}>
                            {severity}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No products match your filters' 
                  : 'No products configured for this combination'}
              </p>
              {searchTerm && (
                <button 
                  onClick={() => {
                    setSearchTerm('')
                    setFilterStatus('all')
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 mr-2"
                >
                  Clear Filters
                </button>
              )}
              {!searchTerm && products.length === 0 && (
                <button onClick={onAdd} className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90">
                  Add First Product
                </button>
              )}
            </div>
          ) : viewMode === 'table' ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts(new Set(filteredProducts.map(p => p.id)))
                        } else {
                          setSelectedProducts(new Set())
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  {productsViewMode === 'all' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parameter</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product, index) => {
                  const originalIndex = products.findIndex(p => p.id === product.id)
                  return (
                  <tr 
                    key={product.id} 
                    className={`${!product.is_active ? 'opacity-50' : ''} ${selectedProducts.has(product.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedProducts)
                          if (e.target.checked) {
                            newSelected.add(product.id)
                          } else {
                            newSelected.delete(product.id)
                          }
                          setSelectedProducts(newSelected)
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMoveUp(originalIndex)}
                          disabled={originalIndex === 0}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium text-gray-900">{product.display_order}</span>
                        <button
                          onClick={() => handleMoveDown(originalIndex)}
                          disabled={originalIndex === products.length - 1}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.product_image ? (
                          <button
                            onClick={() => setShowPreview(product)}
                            className="relative group"
                          >
                            <img
                              src={product.product_image}
                              alt={product.product_name}
                              className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded transition-all flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.product_name}</div>
                          {product.product_description && (
                            <div className="text-xs text-gray-500 mt-1 max-w-md truncate">
                              {product.product_description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {productsViewMode === 'all' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {getParameterName(product.parameter_id)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            {product.severity_level}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleActiveMutation.mutate({ id: product.id, isActive: product.is_active })}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          product.is_active ? 'bg-[#d4a574]/10 text-[#b8956a] hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowPreview(product)} 
                          className="text-purple-600 hover:text-purple-900 transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => duplicateMutation.mutate(product)} 
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="Duplicate"
                          disabled={duplicateMutation.isPending}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onEdit(product)} 
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this product?')) {
                              deleteMutation.mutate(product.id)
                            }
                          }}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            /* Grid View */
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`border rounded-lg p-4 transition-all ${
                      !product.is_active ? 'opacity-50' : ''
                    } ${
                      selectedProducts.has(product.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedProducts)
                            if (e.target.checked) {
                              newSelected.add(product.id)
                            } else {
                              newSelected.delete(product.id)
                            }
                            setSelectedProducts(newSelected)
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          product.is_active ? 'bg-[#d4a574]/10 text-[#b8956a]' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    {product.product_image && (
                      <button
                        onClick={() => setShowPreview(product)}
                        className="w-full mb-3 relative group"
                      >
                        <img
                          src={product.product_image}
                          alt={product.product_name}
                          className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all flex items-center justify-center">
                          <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                        </div>
                      </button>
                    )}
                    
                    <h3 className="font-semibold text-gray-900 mb-2">{product.product_name}</h3>
                    {product.product_description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.product_description}</p>
                    )}
                    
                    {productsViewMode === 'all' && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {getParameterName(product.parameter_id)}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {product.severity_level}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                      <span className="text-xs text-gray-500">Order: {product.display_order}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowPreview(product)}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => duplicateMutation.mutate(product)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Duplicate"
                          disabled={duplicateMutation.isPending}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit(product)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this product?')) {
                              deleteMutation.mutate(product.id)
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product Preview Modal */}
          {showPreview && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(null)}>
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Product Preview</h3>
                    <button
                      onClick={() => setShowPreview(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  {showPreview.product_image && (
                    <div className="mb-4">
                      <img
                        src={showPreview.product_image}
                        alt={showPreview.product_name}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Product Name</label>
                      <p className="text-lg font-semibold text-gray-900">{showPreview.product_name}</p>
                    </div>
                    
                    {showPreview.product_description && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Description</label>
                        <p className="text-gray-600">{showPreview.product_description}</p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <p className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        showPreview.is_active ? 'bg-[#d4a574]/10 text-[#b8956a]' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {showPreview.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    
                    {showPreview.product_link && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Product Link</label>
                        <a
                          href={showPreview.product_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 break-all"
                        >
                          {showPreview.product_link}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setShowPreview(null)
                        onEdit(showPreview)
                      }}
                      className="flex-1 px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90 transition-colors"
                    >
                      Edit Product
                    </button>
                    <button
                      onClick={() => setShowPreview(null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ==================== FORMS ====================

function QuestionForm({
  question,
  onClose,
  onSuccess,
}: {
  question: Question | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    question_text: question?.question_text || '',
    question_type: question?.question_type || 'single_choice',
    category: question?.category || 'general',
    answer_options: question?.answer_options?.join('\n') || '',
    display_order: question?.display_order || 0,
    is_required: question?.is_required ?? true,
    is_active: question?.is_active ?? true,
    icon_name: question?.icon_name || '',
    help_text: question?.help_text || '',
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const dataToSave = {
        ...formData,
        answer_options: formData.answer_options
          ? formData.answer_options.split('\n').filter((opt) => opt.trim())
          : null,
      }

      if (question) {
        const { error } = await supabase
          .from('questionnaire_questions')
          .update(dataToSave)
          .eq('id', question.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('questionnaire_questions').insert([dataToSave])
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(question ? 'Question updated' : 'Question created')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save question')
    },
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{question ? 'Edit Question' : 'Add Question'}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
            <input
              type="text"
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Enter question text"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
              <select
                value={formData.question_type}
                onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="single_choice">Single Choice</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="text">Text Input</option>
                <option value="date">Date</option>
                <option value="number">Number</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="basic_info">Basic Info</option>
                <option value="skin_type">Skin Type</option>
                <option value="skin_concern">Skin Concern</option>
                <option value="lifestyle">Lifestyle</option>
                <option value="treatment_history">Treatment History</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>

          {(formData.question_type === 'single_choice' || formData.question_type === 'multiple_choice') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Answer Options (one per line)</label>
              <textarea
                value={formData.answer_options}
                onChange={(e) => setFormData({ ...formData, answer_options: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={5}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon Name</label>
              <input
                type="text"
                value={formData.icon_name}
                onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Heart, Sun"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Help Text (optional)</label>
            <input
              type="text"
              value={formData.help_text}
              onChange={(e) => setFormData({ ...formData, help_text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Additional help text for users"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_required}
                onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Required</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !formData.question_text}
            className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ParameterForm({
  parameter,
  onClose,
  onSuccess,
}: {
  parameter: Parameter | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    parameter_name: parameter?.parameter_name || '',
    parameter_description: parameter?.parameter_description || '',
    category: parameter?.category || 'concern',
    ai_detection_instructions: parameter?.ai_detection_instructions || '',
    display_order: parameter?.display_order || 0,
    is_active: parameter?.is_active ?? true,
    severity_levels: parameter?.severity_levels?.join(', ') || 'High, Medium, Low',
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const dataToSave = {
        ...formData,
        severity_levels: formData.severity_levels.split(',').map((s) => s.trim()),
      }

      if (parameter) {
        const { error } = await supabase
          .from('skin_analysis_parameters')
          .update(dataToSave)
          .eq('id', parameter.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('skin_analysis_parameters').insert([dataToSave])
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(parameter ? 'Parameter updated' : 'Parameter created')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save parameter')
    },
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{parameter ? 'Edit Parameter' : 'Add Parameter'}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parameter Name *</label>
            <input
              type="text"
              value={formData.parameter_name}
              onChange={(e) => setFormData({ ...formData, parameter_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Dark Spots, Wrinkles"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.parameter_description}
              onChange={(e) => setFormData({ ...formData, parameter_description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="Describe what this parameter measures"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="concern">Concern</option>
                <option value="texture">Texture</option>
                <option value="tone">Tone</option>
                <option value="type">Type</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AI Detection Instructions *</label>
            <textarea
              value={formData.ai_detection_instructions}
              onChange={(e) => setFormData({ ...formData, ai_detection_instructions: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={4}
              placeholder="Instructions for AI on how to detect this parameter in photos. e.g., 'Look for brown or black spots on the skin surface'"
            />
            <p className="text-xs text-gray-500 mt-1">
              These instructions help the AI analyze photos and determine parameter severity
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Levels (comma-separated)</label>
            <input
              type="text"
              value={formData.severity_levels}
              onChange={(e) => setFormData({ ...formData, severity_levels: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Mild, Moderate, Severe"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !formData.parameter_name || !formData.ai_detection_instructions}
            className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductForm({
  product,
  parameters,
  initialParameterId,
  initialSeverityLevel,
  onClose,
  onSuccess,
}: {
  product: Product | null
  parameters: Parameter[]
  initialParameterId: string | null
  initialSeverityLevel: string | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [selectedParameterId, setSelectedParameterId] = useState<string>(
    product?.parameter_id || initialParameterId || ''
  )
  const [selectedSeverityLevel, setSelectedSeverityLevel] = useState<string>(
    product?.severity_level || initialSeverityLevel || ''
  )

  // Get the selected parameter to access its severity levels
  const selectedParameter = parameters.find(p => p.id === selectedParameterId)
  const severityLevels = selectedParameter?.severity_levels || ['High', 'Medium', 'Low']

  // Update severity when parameter changes and no severity is selected yet
  useEffect(() => {
    if (selectedParameterId && !selectedSeverityLevel && severityLevels.length > 0) {
      setSelectedSeverityLevel(severityLevels[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParameterId])

  const [formData, setFormData] = useState({
    product_name: product?.product_name || '',
    product_description: product?.product_description || '',
    product_link: product?.product_link || '',
    product_image: product?.product_image || '',
    display_order: product?.display_order || 0,
    is_active: product?.is_active ?? true,
    is_primary: false, // Keep for database compatibility but not used in UI
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(product?.product_image || null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (product?.product_image) {
      setImagePreview(product.product_image)
    }
  }, [product])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = formData.product_image

      // Upload image if a new file is selected
      if (selectedFile) {
        setUploading(true)
        try {
          const fileExt = selectedFile.name.split('.').pop()
          const fileName = `product-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `product-images/${fileName}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('app-images')
            .upload(filePath, selectedFile)

          if (uploadError) {
            if (uploadError.message?.includes('Bucket not found')) {
              throw new Error('Storage bucket "app-images" not found. Please create it in Supabase Dashboard > Storage.')
            }
            throw uploadError
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from('app-images').getPublicUrl(filePath)
          imageUrl = publicUrl
        } catch (error: any) {
          throw new Error(error.message || 'Failed to upload image')
        } finally {
          setUploading(false)
        }
      }

      if (!selectedParameterId || !selectedSeverityLevel) {
        throw new Error('Please select a parameter and severity level')
      }

      const dataToSave = {
        ...formData,
        product_image: imageUrl,
        parameter_id: selectedParameterId,
        severity_level: selectedSeverityLevel,
      }

      if (product) {
        const { error } = await supabase
          .from('skin_parameter_products')
          .update(dataToSave)
          .eq('id', product.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('skin_parameter_products').insert([dataToSave])
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(product ? 'Product updated' : 'Product created')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save product')
    },
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{product ? 'Edit Product' : 'Add Product'}</h2>

        <div className="space-y-4">
          {/* Parameter Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parameter *</label>
            <select
              value={selectedParameterId}
              onChange={(e) => {
                setSelectedParameterId(e.target.value)
                // Reset severity when parameter changes
                const newParam = parameters.find(p => p.id === e.target.value)
                if (newParam?.severity_levels && newParam.severity_levels.length > 0) {
                  setSelectedSeverityLevel(newParam.severity_levels[0])
                } else {
                  setSelectedSeverityLevel('')
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Select a parameter</option>
              {parameters
                .filter(p => p.is_active)
                .map((param) => (
                  <option key={param.id} value={param.id}>
                    {param.parameter_name} {param.category ? `(${param.category})` : ''}
                  </option>
                ))}
            </select>
            {selectedParameter && selectedParameter.category && (
              <p className="text-xs text-gray-500 mt-1">
                Category: <span className="font-medium">{selectedParameter.category}</span>
              </p>
            )}
          </div>

          {/* Level Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Level *</label>
            <select
              value={selectedSeverityLevel}
              onChange={(e) => setSelectedSeverityLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
              disabled={!selectedParameterId}
            >
              <option value="">Select level</option>
              {severityLevels.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
            {!selectedParameterId && (
              <p className="text-xs text-gray-500 mt-1">Please select a parameter first</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              type="text"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Dark Spot Corrector"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Description</label>
            <textarea
              value={formData.product_description}
              onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="Brief description of the product"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Link</label>
            <input
              type="url"
              value={formData.product_link}
              onChange={(e) => setFormData({ ...formData, product_link: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="https://www.karmaterra.in/..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Image *</label>
            <div className="space-y-3">
              {/* Upload Option */}
              <div>
                <label className="block text-xs text-gray-600 mb-2">Upload Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Max size: 5MB. Supported: JPG, PNG, WebP</p>
              </div>
              
              {/* OR Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              {/* URL Option */}
              <div>
                <label className="block text-xs text-gray-600 mb-2">Image URL</label>
                <input
                  type="url"
                  value={formData.product_image}
                  onChange={(e) => {
                    setFormData({ ...formData, product_image: e.target.value })
                    setImagePreview(e.target.value)
                    setSelectedFile(null)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://..."
                />
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="mt-3">
                  <label className="block text-xs text-gray-600 mb-2">Preview:</label>
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-300"
                    onError={() => {
                      setImagePreview(null)
                      toast.error('Failed to load image preview')
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={
              saveMutation.isPending || 
              uploading || 
              !formData.product_name || 
              !selectedParameterId || 
              !selectedSeverityLevel ||
              (!formData.product_image && !selectedFile)
            }
            className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== RATING CONFIG TAB ====================

function RatingConfigTab({
  ratingConfig,
  onConfigChange,
  onSave,
  isSaving,
}: {
  ratingConfig: RatingConfig
  onConfigChange: (config: RatingConfig) => void
  onSave: () => void
  isSaving: boolean
}) {
  return (
    <div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Rating Range Configuration</h2>
          <p className="text-sm text-gray-600">
            Configure the rating ranges for categorizing skin analysis parameters. Ratings are on a scale of 1-10.
          </p>
        </div>

        <div className="space-y-6">
          {/* Low Range */}
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-600"></div>
              Low Range
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={ratingConfig.low_min}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1
                    if (value >= 1 && value <= 10 && value <= ratingConfig.low_max) {
                      onConfigChange({ ...ratingConfig, low_min: value })
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={ratingConfig.low_max}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 3
                    if (value >= 1 && value <= 10 && value >= ratingConfig.low_min && value < ratingConfig.medium_min) {
                      onConfigChange({ ...ratingConfig, low_max: value })
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <p className="text-xs text-green-700 mt-2">
              Current range: {ratingConfig.low_min} - {ratingConfig.low_max}
            </p>
          </div>

          {/* Medium Range */}
          <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-600"></div>
              Medium Range
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={ratingConfig.medium_min}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 4
                    if (value >= 1 && value <= 10 && value > ratingConfig.low_max && value <= ratingConfig.medium_max) {
                      onConfigChange({ ...ratingConfig, medium_min: value })
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={ratingConfig.medium_max}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 7
                    if (value >= 1 && value <= 10 && value >= ratingConfig.medium_min && value < ratingConfig.high_min) {
                      onConfigChange({ ...ratingConfig, medium_max: value })
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <p className="text-xs text-yellow-700 mt-2">
              Current range: {ratingConfig.medium_min} - {ratingConfig.medium_max}
            </p>
          </div>

          {/* High Range */}
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-600"></div>
              High Range
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={ratingConfig.high_min}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 8
                    if (value >= 1 && value <= 10 && value > ratingConfig.medium_max && value <= ratingConfig.high_max) {
                      onConfigChange({ ...ratingConfig, high_min: value })
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={ratingConfig.high_max}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 10
                    if (value >= 1 && value <= 10 && value >= ratingConfig.high_min) {
                      onConfigChange({ ...ratingConfig, high_max: value })
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <p className="text-xs text-red-700 mt-2">
              Current range: {ratingConfig.high_min} - {ratingConfig.high_max}
            </p>
          </div>

          {/* Validation Messages */}
          {(ratingConfig.low_max >= ratingConfig.medium_min || 
            ratingConfig.medium_max >= ratingConfig.high_min ||
            ratingConfig.low_min < 1 || ratingConfig.high_max > 10) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">⚠️ Validation Errors:</p>
              <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                {ratingConfig.low_max >= ratingConfig.medium_min && (
                  <li>Low maximum must be less than Medium minimum</li>
                )}
                {ratingConfig.medium_max >= ratingConfig.high_min && (
                  <li>Medium maximum must be less than High minimum</li>
                )}
                {ratingConfig.low_min < 1 && (
                  <li>Low minimum must be at least 1</li>
                )}
                {ratingConfig.high_max > 10 && (
                  <li>High maximum cannot exceed 10</li>
                )}
              </ul>
            </div>
          )}

          {/* Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Preview:</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
                <div className="text-lg font-bold text-green-700">Low</div>
                <div className="text-xs text-green-600 mt-1">{ratingConfig.low_min}-{ratingConfig.low_max}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-yellow-200 text-center">
                <div className="text-lg font-bold text-yellow-700">Medium</div>
                <div className="text-xs text-yellow-600 mt-1">{ratingConfig.medium_min}-{ratingConfig.medium_max}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-red-200 text-center">
                <div className="text-lg font-bold text-red-700">High</div>
                <div className="text-xs text-red-600 mt-1">{ratingConfig.high_min}-{ratingConfig.high_max}</div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={onSave}
              disabled={
                isSaving ||
                ratingConfig.low_max >= ratingConfig.medium_min ||
                ratingConfig.medium_max >= ratingConfig.high_min ||
                ratingConfig.low_min < 1 ||
                ratingConfig.high_max > 10
              }
              className="px-6 py-3 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}





