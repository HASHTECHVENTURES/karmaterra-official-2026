import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, ShoppingBag, FileQuestion, Target, ArrowUp, ArrowDown, X, Eye, Search, Download, BarChart3, GripVertical, Upload } from 'lucide-react'
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

interface HairQuestion {
  id: string
  question_text: string
  question_type: string
  answer_options?: string[]
  display_order: number
  is_required: boolean
  is_active: boolean
  icon_name?: string
  help_text?: string
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

interface RatingConfig {
  low_min: number
  low_max: number
  medium_min: number
  medium_max: number
  high_min: number
  high_max: number
}

// ==================== SORTABLE QUESTION ROW ====================

interface SortableHairQuestionRowProps {
  question: HairQuestion
  index: number
  onEdit: (q: HairQuestion) => void
  onDelete: (id: string) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  totalQuestions: number
}

function SortableHairQuestionRow({
  question,
  index,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  totalQuestions,
}: SortableHairQuestionRowProps) {
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
    <div
      ref={setNodeRef}
      style={style}
      className={`p-6 ${isDragging ? 'bg-purple-50' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <button
              {...attributes}
              {...listeners}
              className="p-1 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
              title="Drag to reorder"
            >
              <GripVertical className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-gray-500">#{question.display_order}</span>
            <h3 className="text-lg font-semibold text-gray-900">{question.question_text}</h3>
            {question.is_required && (
              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Required</span>
            )}
            {!question.is_active && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">Inactive</span>
            )}
          </div>
          {question.answer_options && question.answer_options.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-1">Options:</p>
              <div className="flex flex-wrap gap-2">
                {question.answer_options.map((option, optIdx) => (
                  <span
                    key={optIdx}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg"
                  >
                    {option}
                  </span>
                ))}
              </div>
            </div>
          )}
          {question.help_text && (
            <p className="text-sm text-gray-500 mt-2">{question.help_text}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
            title="Move up"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === totalQuestions - 1}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
            title="Move down"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(question)}
            className="text-blue-600 hover:text-blue-900 transition-colors"
          >
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
      </div>
    </div>
  )
}

export default function HairPage() {
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
  const [editingQuestion, setEditingQuestion] = useState<HairQuestion | null>(null)
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
  
  // Drag and drop sensors - must be at top level (Rules of Hooks)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch questions
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['hair-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hair_questions')
        .select('*')
        .order('display_order', { ascending: true })
      if (error) throw error
      
      // Parse JSONB answer_options
      return ((data as any[]) || []).map((q) => ({
        ...q,
        answer_options: q.answer_options ? (Array.isArray(q.answer_options) ? q.answer_options : JSON.parse(q.answer_options)) : [],
      })) as HairQuestion[]
    },
  })

  // Fetch parameters
  const { data: parameters, isLoading: parametersLoading } = useQuery({
    queryKey: ['hair-parameters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hair_analysis_parameters')
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
    queryKey: ['hair-products-filtered', selectedParameter, selectedSeverity],
    queryFn: async () => {
      if (!selectedParameter || !selectedSeverity) return []
      const { data, error } = await supabase
        .from('hair_parameter_products')
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
    queryKey: ['hair-products-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hair_parameter_products')
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
    queryKey: ['hair-rating-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('hair_rating_config')
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching rating config:', error)
        return null
      }
      
      if (data?.hair_rating_config) {
        return data.hair_rating_config as RatingConfig
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
        .select('id, hair_rating_config')
        .maybeSingle()

      if (existingConfig?.id) {
        const { error } = await supabase
          .from('app_config')
          .update({ hair_rating_config: config })
          .eq('id', existingConfig.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('app_config')
          .insert([{ hair_rating_config: config }])
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success('Rating configuration saved successfully')
      queryClient.invalidateQueries({ queryKey: ['hair-rating-config'] })
      queryClient.invalidateQueries({ queryKey: ['hair-reports'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save rating configuration')
    },
  })

  const currentParameter = parameters?.find((p) => p.id === selectedParameter)
  const severityLevels = currentParameter?.severity_levels || ['High', 'Medium', 'Low']

  // Parameter mutations
  const deleteParameterMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hair_analysis_parameters').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hair-parameters'] })
      toast.success('Parameter deleted successfully')
    },
  })

  const toggleParameterActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('hair_analysis_parameters')
        .update({ is_active: !isActive })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hair-parameters'] })
      toast.success('Parameter status updated')
    },
  })

  const updateParameterOrderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase
        .from('hair_analysis_parameters')
        .update({ display_order: newOrder })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hair-parameters'] })
    },
  })

  const handleParameterMoveUp = (index: number) => {
    if (index === 0 || !parameters) return
    const param = parameters[index]
    const prevParam = parameters[index - 1]
    updateParameterOrderMutation.mutate({ id: param.id, newOrder: prevParam.display_order })
    updateParameterOrderMutation.mutate({ id: prevParam.id, newOrder: param.display_order })
  }

  const handleParameterMoveDown = (index: number) => {
    if (!parameters || index === parameters.length - 1) return
    const param = parameters[index]
    const nextParam = parameters[index + 1]
    updateParameterOrderMutation.mutate({ id: param.id, newOrder: nextParam.display_order })
    updateParameterOrderMutation.mutate({ id: nextParam.id, newOrder: param.display_order })
  }

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('analysis_history').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hair-reports'] })
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
      
      // Try multiple possible structures for the report data
      const hairAnalysis = report?.hair_analysis || report?.result?.hair_analysis
      const overallHealth = hairAnalysis?.["Overall Hair Health"]
      const result = report?.result
      const parameters = result?.parameters || []
      const summary = result?.summary || report?.summary
      const overallSeverity = result?.overallSeverity || report?.overallSeverity || overallHealth?.severity || 'N/A'
      const images = report?.faceImages || report?.result?.faceImages || []
      
      let yPos = 20
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 20
      const maxWidth = pageWidth - (margin * 2)
      
      // Helper function to load image and add to PDF
      const addImageToPDF = (imageUrl: string, x: number, y: number, width: number, height: number, label: string): Promise<number> => {
        return new Promise((resolve, reject) => {
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
      
      // Title
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('Hair Analysis Report', margin, yPos)
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
      doc.text(`Overall Severity: ${overallSeverity}`, margin, yPos)
      yPos += 10
      
      // Summary
      if (summary) {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Summary', margin, yPos)
        yPos += 7
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        const summaryLines = doc.splitTextToSize(summary, maxWidth)
        doc.text(summaryLines, margin, yPos)
        yPos += summaryLines.length * 5 + 5
      }
      
      // Analysis Images
      if (images && images.length > 0) {
        if (yPos > 200) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Analysis Images', margin, yPos)
        yPos += 10
        
        const imageLabels = ['Front Face', 'Right Side', 'Left Side']
        const imagesPerRow = images.length <= 2 ? images.length : 3
        const imageWidth = (maxWidth - (imagesPerRow - 1) * 5) / imagesPerRow
        const imageHeight = imageWidth * 0.75
        
        let currentX = margin
        let maxY = yPos
        
        for (let i = 0; i < images.length; i++) {
          if (yPos > 200) {
            doc.addPage()
            yPos = 20
            currentX = margin
          }
          
          const label = imageLabels[i] || `Image ${i + 1}`
          const newY = await addImageToPDF(images[i], currentX, yPos, imageWidth, imageHeight, label)
          maxY = Math.max(maxY, newY)
          
          currentX += imageWidth + 5
          
          if ((i + 1) % imagesPerRow === 0) {
            yPos = maxY + 5
            currentX = margin
            maxY = yPos
          }
        }
        
        yPos = maxY + 10
      }
      
      // Overall Health
      if (overallHealth) {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Overall Hair Health', margin, yPos)
        yPos += 7
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        if (overallHealth.description) {
          const descriptionLines = doc.splitTextToSize(overallHealth.description, maxWidth)
          doc.text(descriptionLines, margin, yPos)
          yPos += descriptionLines.length * 5
        }
        if (overallHealth.rating) {
          doc.text(`Rating: ${overallHealth.rating}/10`, margin, yPos)
          yPos += 6
        }
        yPos += 5
      }
      
      // Detailed Analysis - Show configured parameters
      // Map AI analysis results to configured parameters
      const potentialIssues = hairAnalysis?.["4. Potential Issues"]
      const scalpHealth = hairAnalysis?.["2. Scalp Health and Condition"]
      const hairTexture = hairAnalysis?.["3. Hair Texture and Quality"]
      
      // Define the configured parameters and map them to AI analysis data
      const configuredParameters = [
        {
          name: 'Dandruff',
          description: 'Presence of white or yellowish flakes on the scalp and hair',
          data: potentialIssues?.dandruff,
          severity: potentialIssues?.severity,
          rating: potentialIssues?.rating,
          notes: potentialIssues?.notes
        },
        {
          name: 'Frizzy Hair',
          description: 'Hair that appears unruly, lacks smoothness, and has flyaway strands',
          data: hairTexture ? `${hairTexture.texture || ''} ${hairTexture.quality || ''}`.trim() : null,
          severity: hairTexture?.severity,
          rating: hairTexture?.rating,
          notes: hairTexture?.notes
        },
        {
          name: 'Dry and Damaged Scalp',
          description: 'Scalp showing signs of dryness, flakiness, tightness, or damage',
          data: scalpHealth?.dryness_or_oiliness || potentialIssues?.damage,
          severity: scalpHealth?.severity || potentialIssues?.severity,
          rating: scalpHealth?.rating || potentialIssues?.rating,
          notes: scalpHealth?.notes || potentialIssues?.notes
        },
        {
          name: 'Oily Scalp',
          description: 'Excessive oil production on the scalp making hair appear greasy',
          data: scalpHealth?.dryness_or_oiliness,
          severity: scalpHealth?.severity,
          rating: scalpHealth?.rating,
          notes: scalpHealth?.notes
        },
        {
          name: 'Itchy Scalp',
          description: 'Scalp discomfort characterized by itching sensation',
          data: scalpHealth?.redness_or_irritation,
          severity: scalpHealth?.severity,
          rating: scalpHealth?.rating,
          notes: scalpHealth?.notes
        }
      ]
      
      // Show Detailed Analysis with configured parameters
      if (hairAnalysis || parameters.length > 0) {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Detailed Analysis', margin, yPos)
        yPos += 7
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        
        // Show configured parameters
        configuredParameters.forEach((param) => {
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }
          
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          const paramNameLines = doc.splitTextToSize(param.name, maxWidth)
          doc.text(paramNameLines, margin, yPos)
          yPos += paramNameLines.length * 5
          
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          const descLines = doc.splitTextToSize(param.description, maxWidth)
          doc.text(descLines, margin, yPos)
          yPos += descLines.length * 5
          
          if (param.severity) {
            doc.setFont('helvetica', 'bold')
            doc.text(`Severity: ${param.severity}`, margin, yPos)
            yPos += 6
          }
          if (param.rating) {
            doc.setFont('helvetica', 'normal')
            doc.text(`Rating: ${param.rating}/10`, margin, yPos)
            yPos += 6
          }
          if (param.data) {
            doc.setFont('helvetica', 'normal')
            const dataLines = doc.splitTextToSize(param.data, maxWidth)
            doc.text(dataLines, margin, yPos)
            yPos += dataLines.length * 5
          }
          if (param.notes) {
            doc.setFont('helvetica', 'italic')
            doc.setFontSize(9)
            const notesLines = doc.splitTextToSize(`Notes: ${param.notes}`, maxWidth)
            doc.text(notesLines, margin, yPos)
            yPos += notesLines.length * 5
          }
          
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
          yPos += 5
        })
      }
      
      // Recommendations
      if (hairAnalysis?.["6. Recommendations for Improvement"]) {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Recommendations', margin, yPos)
        yPos += 7
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        
        Object.entries(hairAnalysis["6. Recommendations for Improvement"]).forEach(([key, value]: [string, any]) => {
          if (key === 'rating' || key === 'severity' || key === 'notes') {
            if (key === 'notes' && value) {
              if (yPos > 250) {
                doc.addPage()
                yPos = 20
              }
              doc.setFont('helvetica', 'bold')
              doc.text('General Notes:', margin, yPos)
              yPos += 6
              doc.setFont('helvetica', 'normal')
              const notesLines = doc.splitTextToSize(String(value), maxWidth)
              doc.text(notesLines, margin, yPos)
              yPos += notesLines.length * 5 + 3
            }
            return
          }
          
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }
          
          doc.setFont('helvetica', 'bold')
          const keyText = key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
          doc.text(keyText + ':', margin, yPos)
          yPos += 6
          
          doc.setFont('helvetica', 'normal')
          const valueLines = doc.splitTextToSize(String(value), maxWidth)
          doc.text(valueLines, margin + 5, yPos)
          yPos += valueLines.length * 5 + 3
        })
      }
      
      // Routine Recommendations (from converted format)
      if (result?.routine) {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Recommended Routines', margin, yPos)
        yPos += 7
        
        if (result.routine.morning && result.routine.morning.length > 0) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.text('Morning Routine:', margin, yPos)
          yPos += 6
          
          doc.setFont('helvetica', 'normal')
          result.routine.morning.forEach((routine: string) => {
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
        
        if (result.routine.evening && result.routine.evening.length > 0) {
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.text('Evening Routine:', margin, yPos)
          yPos += 6
          
          doc.setFont('helvetica', 'normal')
          result.routine.evening.forEach((routine: string) => {
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
      const fileName = `hair-report-${analysis.id}-${new Date(analysis.created_at).toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      toast.success('Report downloaded as PDF successfully')
    } catch (error: any) {
      console.error('PDF generation error:', error)
      toast.error('Failed to download report: ' + error.message)
    }
  }

  // Fetch hair reports - FIXED: Use join to avoid N+1 queries
  const { data: reports, isLoading: reportsLoading, error: reportsError } = useQuery({
    queryKey: ['hair-reports', searchTerm],
    queryFn: async () => {
      try {
        // First, fetch all analysis history records
        const { data: analysisData, error: analysisError } = await supabase
          .from('analysis_history')
          .select('*')
          .eq('analysis_type', 'hair')
          .order('created_at', { ascending: false })

        if (analysisError) {
          console.error('Error fetching hair reports:', analysisError)
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
        console.error('Error in hair reports query:', error)
        toast.error('Failed to load hair reports: ' + (error.message || 'Unknown error'))
        return []
      }
    },
    enabled: activeTab === 'reports',
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="mb-8"><h1 className="text-3xl font-bold text-gray-900 mb-2">Know Your Hair</h1><p className="text-gray-600">Manage and view Know Your Hair</p></div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'questions'
                  ? 'border-purple-600 text-purple-600'
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
                  ? 'border-purple-600 text-purple-600'
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
                  ? 'border-purple-600 text-purple-600'
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
                  ? 'border-purple-600 text-purple-600'
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
                  ? 'border-purple-600 text-purple-600'
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
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Hair Questionnaire Questions</h2>
            <button
              onClick={() => {
                setEditingQuestion(null)
                setShowQuestionForm(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="w-5 h-5" />
              Add Question
            </button>
          </div>

          {showQuestionForm && (
            <HairQuestionForm
              question={editingQuestion}
              onClose={() => {
                setShowQuestionForm(false)
                setEditingQuestion(null)
              }}
              onSuccess={() => {
                setShowQuestionForm(false)
                setEditingQuestion(null)
                queryClient.invalidateQueries({ queryKey: ['hair-questions'] })
              }}
            />
          )}

          {questionsLoading ? (
            <div className="text-center py-12">Loading questions...</div>
          ) : questions && questions.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event: DragEndEvent) => {
                  const { active, over } = event
                  if (over && active.id !== over.id && questions) {
                    const oldIndex = questions.findIndex((q) => q.id === active.id)
                    const newIndex = questions.findIndex((q) => q.id === over.id)
                    if (oldIndex !== -1 && newIndex !== -1) {
                      const reorderedQuestions = arrayMove(questions, oldIndex, newIndex)
                      const updatePromises = reorderedQuestions.map((q, idx) => {
                        const newOrder = idx + 1
                        return supabase
                          .from('hair_questions')
                          .update({ display_order: newOrder })
                          .eq('id', q.id)
                      })
                      Promise.all(updatePromises)
                        .then(() => {
                          queryClient.invalidateQueries({ queryKey: ['hair-questions'] })
                          toast.success('Questions reordered successfully')
                        })
                        .catch((error) => {
                          console.error('Error reordering questions:', error)
                          toast.error('Failed to reorder questions')
                        })
                    }
                  }
                }}
              >
                <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                  <div className="divide-y divide-gray-200">
                    {questions.map((question, index) => (
                      <SortableHairQuestionRow
                        key={question.id}
                        question={question}
                        index={index}
                        onEdit={(q) => {
                          setEditingQuestion(q)
                          setShowQuestionForm(true)
                        }}
                        onDelete={async (id) => {
                          const { error } = await supabase
                            .from('hair_questions')
                            .delete()
                            .eq('id', id)
                          if (error) {
                            toast.error('Failed to delete question')
                          } else {
                            queryClient.invalidateQueries({ queryKey: ['hair-questions'] })
                            toast.success('Question deleted')
                          }
                        }}
                        onMoveUp={async (idx) => {
                          if (idx > 0 && questions) {
                            const prevQuestion = questions[idx - 1]
                            const currentOrder = question.display_order
                            const prevOrder = prevQuestion.display_order
                            await supabase
                              .from('hair_questions')
                              .update({ display_order: prevOrder })
                              .eq('id', question.id)
                            await supabase
                              .from('hair_questions')
                              .update({ display_order: currentOrder })
                              .eq('id', prevQuestion.id)
                            queryClient.invalidateQueries({ queryKey: ['hair-questions'] })
                          }
                        }}
                        onMoveDown={async (idx) => {
                          if (idx < questions.length - 1 && questions) {
                            const nextQuestion = questions[idx + 1]
                            const currentOrder = question.display_order
                            const nextOrder = nextQuestion.display_order
                            await supabase
                              .from('hair_questions')
                              .update({ display_order: nextOrder })
                              .eq('id', question.id)
                            await supabase
                              .from('hair_questions')
                              .update({ display_order: currentOrder })
                              .eq('id', nextQuestion.id)
                            queryClient.invalidateQueries({ queryKey: ['hair-questions'] })
                          }
                        }}
                        totalQuestions={questions.length}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
              <FileQuestion className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No questions configured yet</p>
              <button
                onClick={() => setShowQuestionForm(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Add First Question
              </button>
            </div>
          )}
        </div>
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
            queryClient.invalidateQueries({ queryKey: ['hair-parameters'] })
          }}
          onDelete={(id) => deleteParameterMutation.mutate(id)}
          onToggleActive={(id, isActive) => toggleParameterActiveMutation.mutate({ id, isActive })}
          onMoveUp={handleParameterMoveUp}
          onMoveDown={handleParameterMoveDown}
          sensors={sensors}
        />
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
            queryClient.invalidateQueries({ queryKey: ['hair-products-filtered'] })
            queryClient.invalidateQueries({ queryKey: ['hair-products-all'] })
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

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Hair Analysis Reports</h2>
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    {/* Overall Health column hidden */}
                    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overall Health</th> */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((analysis: any) => {
                    const report = analysis.analysis_result
                    // Try multiple possible structures for description
                    const hairAnalysis = report?.hair_analysis || report?.result?.hair_analysis
                    const overallHealth = hairAnalysis?.["Overall Hair Health"]
                    const summary = report?.result?.summary || report?.summary
                    // const severity = overallHealth?.severity || 'N/A' // Hidden column
                    const description = overallHealth?.description || summary || 'No description available'
                    
                    return (
                      <tr key={analysis.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {analysis.user?.full_name || analysis.user?.email || 'N/A'}
                          </div>
                        </td>
                        {/* Overall Health column hidden */}
                        {/* <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            severity === 'Mild' ? 'bg-[#d4a574]/10 text-[#b8956a]' :
                            severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            severity === 'Severe' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {severity}
                          </span>
                        </td> */}
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-md truncate">{description}</div>
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
              <p className="text-gray-500">No hair analysis reports found</p>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500">
            Showing {reports?.length || 0} report(s)
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {showReportDetails && selectedReport && (
        <HairReportDetailsModal
          analysis={selectedReport}
          onClose={() => {
            setShowReportDetails(false)
            setSelectedReport(null)
          }}
        />
      )}
    </div>
  )
}

// ==================== COMPONENTS ====================

// Parameters Tab Component
function ParametersTab({
  parameters,
  isLoading,
  editingParameter,
  showParameterForm,
  onEdit,
  onAdd,
  onClose,
  onSuccess,
  onDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  sensors,
}: {
  parameters: Parameter[]
  isLoading: boolean
  editingParameter: Parameter | null
  showParameterForm: boolean
  onEdit: (p: Parameter) => void
  onAdd: () => void
  onClose: () => void
  onSuccess: () => void
  onDelete: (id: string) => void
  onToggleActive: (id: string, isActive: boolean) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  sensors: any
}) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hair_analysis_parameters').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hair-parameters'] })
      toast.success('Parameter deleted successfully')
    },
  })

  if (isLoading) {
    return <div className="text-center py-12">Loading parameters...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Hair Analysis Parameters</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Parameter
        </button>
      </div>

      {showParameterForm && (
        <ParameterForm
          parameter={editingParameter}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}

      {parameters.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No parameters configured yet</p>
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Add First Parameter
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event: DragEndEvent) => {
              const { active, over } = event
              if (over && active.id !== over.id && parameters) {
                const oldIndex = parameters.findIndex((p) => p.id === active.id)
                const newIndex = parameters.findIndex((p) => p.id === over.id)
                if (oldIndex !== -1 && newIndex !== -1) {
                  const reorderedParameters = arrayMove(parameters, oldIndex, newIndex)
                  const updatePromises = reorderedParameters.map((p, idx) => {
                    const newOrder = idx + 1
                    return supabase
                      .from('hair_analysis_parameters')
                      .update({ display_order: newOrder })
                      .eq('id', p.id)
                  })
                  Promise.all(updatePromises)
                    .then(() => {
                      queryClient.invalidateQueries({ queryKey: ['hair-parameters'] })
                      toast.success('Parameters reordered successfully')
                    })
                    .catch((error) => {
                      console.error('Error reordering parameters:', error)
                      toast.error('Failed to reorder parameters')
                    })
                }
              }
            }}
          >
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
                      onDelete={(id) => {
                        if (confirm('Are you sure you want to delete this parameter?')) {
                          deleteMutation.mutate(id)
                        }
                      }}
                      onToggleActive={onToggleActive}
                      onMoveUp={onMoveUp}
                      onMoveDown={onMoveDown}
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

// Sortable Parameter Row
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
            onClick={() => onDelete(parameter.id)}
            className="text-red-600 hover:text-red-900 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// Parameter Form Component
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
          .from('hair_analysis_parameters')
          .update(dataToSave)
          .eq('id', parameter.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('hair_analysis_parameters').insert([dataToSave])
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
              placeholder="e.g., Dandruff, Frizzy Hair"
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
                <option value="condition">Condition</option>
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
              placeholder="Instructions for AI on how to detect this parameter in photos."
            />
            <p className="text-xs text-gray-500 mt-1">
              These instructions help the AI analyze photos and determine parameter severity
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity Levels (comma-separated)</label>
            <input
              type="text"
              value={formData.severity_levels}
              onChange={(e) => setFormData({ ...formData, severity_levels: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="High, Medium, Low"
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
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Products Tab Component - simplified version
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
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Product Suggestions</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 p-1">
            <button
              onClick={() => onViewModeChange('filtered')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                productsViewMode === 'filtered'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Filtered
            </button>
            <button
              onClick={() => onViewModeChange('all')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                productsViewMode === 'all'
                  ? 'bg-purple-600 text-white'
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
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>
      </div>

      {showProductForm && (
        <ProductForm
          product={editingProduct}
          parameters={parameters}
          initialParameterId={selectedParameter}
          initialSeverityLevel={selectedSeverity}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}

      {productsViewMode === 'filtered' && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Parameter</label>
              <select
                value={selectedParameter || ''}
                onChange={(e) => onParameterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select Parameter</option>
                {parameters.map((param) => (
                  <option key={param.id} value={param.id}>
                    {param.parameter_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity Level</label>
              <select
                value={selectedSeverity || ''}
                onChange={(e) => onSeverityChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={!selectedParameter}
              >
                <option value="">Select Severity</option>
                {severityLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            {productsViewMode === 'filtered' && (!selectedParameter || !selectedSeverity)
              ? 'Please select a parameter and severity level to view products'
              : 'No products configured yet'}
          </p>
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Add First Product
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parameter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => {
                const param = parameters.find((p) => p.id === product.parameter_id)
                return (
                  <tr key={product.id} className={!product.is_active ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.display_order}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{product.product_name}</div>
                      {product.product_description && (
                        <div className="text-xs text-gray-500 mt-1 max-w-md truncate">
                          {product.product_description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {param?.parameter_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.severity_level}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        product.is_active ? 'bg-[#d4a574]/10 text-[#b8956a]' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button onClick={() => onEdit(product)} className="text-blue-600 hover:text-blue-900">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this product?')) {
                              // Delete mutation will be handled in parent
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
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
      )}
    </div>
  )
}

// Product Form Component
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

  const selectedParameter = parameters.find(p => p.id === selectedParameterId)
  const severityLevels = selectedParameter?.severity_levels || ['High', 'Medium', 'Low']

  useEffect(() => {
    if (selectedParameterId && !selectedSeverityLevel && severityLevels.length > 0) {
      setSelectedSeverityLevel(severityLevels[0])
    }
  }, [selectedParameterId, severityLevels, selectedSeverityLevel])

  const [formData, setFormData] = useState({
    product_name: product?.product_name || '',
    product_description: product?.product_description || '',
    product_link: product?.product_link || '',
    product_image: product?.product_image || '',
    display_order: product?.display_order || 0,
    is_active: product?.is_active ?? true,
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
          .from('hair_parameter_products')
          .update(dataToSave)
          .eq('id', product.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('hair_parameter_products').insert([dataToSave])
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parameter *</label>
              <select
                value={selectedParameterId}
                onChange={(e) => setSelectedParameterId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select Parameter</option>
                {parameters.map((param) => (
                  <option key={param.id} value={param.id}>
                    {param.parameter_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity Level *</label>
              <select
                value={selectedSeverityLevel}
                onChange={(e) => setSelectedSeverityLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={!selectedParameterId}
              >
                <option value="">Select Severity</option>
                {severityLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              type="text"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.product_description}
              onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Link</label>
              <input
                type="url"
                value={formData.product_link}
                onChange={(e) => setFormData({ ...formData, product_link: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input
                type="url"
                value={formData.product_image}
                onChange={(e) => setFormData({ ...formData, product_image: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            {imagePreview && (
              <div className="mt-2">
                <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded" />
              </div>
            )}
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
            disabled={saveMutation.isPending || !formData.product_name || !selectedParameterId || !selectedSeverityLevel}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Rating Config Tab Component
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
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Rating Configuration</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure the rating ranges for hair analysis parameters
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Low Range</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={ratingConfig.low_min}
                  onChange={(e) => onConfigChange({ ...ratingConfig, low_min: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={ratingConfig.low_max}
                  onChange={(e) => onConfigChange({ ...ratingConfig, low_max: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Medium Range</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={ratingConfig.medium_min}
                  onChange={(e) => onConfigChange({ ...ratingConfig, medium_min: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={ratingConfig.medium_max}
                  onChange={(e) => onConfigChange({ ...ratingConfig, medium_max: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">High Range</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={ratingConfig.high_min}
                  onChange={(e) => onConfigChange({ ...ratingConfig, high_min: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={ratingConfig.high_max}
                  onChange={(e) => onConfigChange({ ...ratingConfig, high_max: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  )
}

// HairQuestionForm Component
function HairQuestionForm({
  question,
  onClose,
  onSuccess,
}: {
  question: HairQuestion | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    question_text: question?.question_text || '',
    question_type: question?.question_type || 'single_choice',
    answer_options: question?.answer_options || [],
    display_order: question?.display_order || 0,
    is_required: question?.is_required ?? true,
    is_active: question?.is_active ?? true,
    icon_name: question?.icon_name || '',
    help_text: question?.help_text || '',
  })
  const [newOption, setNewOption] = useState('')

  const saveMutation = useMutation({
    mutationFn: async () => {
      const dataToSave = {
        question_text: formData.question_text,
        question_type: formData.question_type,
        answer_options: formData.answer_options.length > 0 ? formData.answer_options : null,
        is_required: formData.is_required,
        is_active: formData.is_active,
        icon_name: formData.icon_name || null,
        help_text: formData.help_text || null,
      }

      if (question) {
        const { error } = await supabase
          .from('hair_questions')
          .update(dataToSave)
          .eq('id', question.id)
        if (error) throw error
      } else {
        // Get max display_order for new questions
        const { data: maxOrder } = await supabase
          .from('hair_questions')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1)
          .single()
        
        const dataWithOrder = {
          ...dataToSave,
          display_order: maxOrder?.display_order ? maxOrder.display_order + 1 : 1,
        }

        const { error } = await supabase.from('hair_questions').insert([dataWithOrder])
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

  const addOption = () => {
    if (newOption.trim()) {
      setFormData({
        ...formData,
        answer_options: [...formData.answer_options, newOption.trim()],
      })
      setNewOption('')
    }
  }

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      answer_options: formData.answer_options.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{question ? 'Edit Question' : 'Add Question'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question Text *</label>
            <textarea
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
              placeholder="Enter the question..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question Type *</label>
              <select
                value={formData.question_type}
                onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="single_choice">Single Choice</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="text">Text Input</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon Name</label>
              <input
                type="text"
                value={formData.icon_name}
                onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Waves, Heart, Sparkles"
              />
            </div>
          </div>

          {(formData.question_type === 'single_choice' || formData.question_type === 'multiple_choice') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Answer Options *</label>
              <div className="space-y-2">
                {formData.answer_options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="flex-1 px-3 py-2 bg-gray-100 rounded-lg">{option}</span>
                    <button
                      onClick={() => removeOption(index)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addOption()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Add new option..."
                  />
                  <button
                    onClick={addOption}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Help Text</label>
            <input
              type="text"
              value={formData.help_text}
              onChange={(e) => setFormData({ ...formData, help_text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Optional help text for users"
            />
          </div>

          <div className="flex items-center gap-6">
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
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !formData.question_text || (formData.question_type !== 'text' && formData.answer_options.length === 0)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function HairProductForm({
  product,
  onClose,
  onSuccess,
}: {
  product: Product | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    product_name: product?.product_name || '',
    product_description: product?.product_description || '',
    product_link: product?.product_link || '',
    product_image: product?.product_image || '',
    display_order: product?.display_order || 0,
    is_active: product?.is_active ?? true,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Get max display_order for new products
      let displayOrder = formData.display_order
      if (!product) {
        const { data: maxOrder } = await supabase
          .from('hair_type_products')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1)
          .single()
        
        displayOrder = maxOrder?.display_order ? maxOrder.display_order + 1 : 1
      }

      const dataToSave = {
        ...formData,
        display_order: displayOrder,
        hair_type: 'general', // Use 'general' as default since we're not categorizing by hair type
      }

      if (product) {
        const { error } = await supabase
          .from('hair_type_products')
          .update(dataToSave)
          .eq('id', product.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('hair_type_products').insert([dataToSave])
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
        <h2 className="text-2xl font-bold mb-4">
          {product ? 'Edit Product' : 'Add Product'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              type="text"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.product_description}
              onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Link</label>
              <input
                type="url"
                value={formData.product_link}
                onChange={(e) => setFormData({ ...formData, product_link: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input
                type="url"
                value={formData.product_image}
                onChange={(e) => setFormData({ ...formData, product_image: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="https://..."
              />
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
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !formData.product_name}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function HairReportDetailsModal({
  analysis,
  onClose,
}: {
  analysis: any
  onClose: () => void
}) {
  const report = analysis.analysis_result
  
  // Try multiple possible structures for the report data
  // Structure 1: Direct hair_analysis (from AI response)
  const hairAnalysis = report?.hair_analysis || report?.result?.hair_analysis
  const overallHealth = hairAnalysis?.["Overall Hair Health"]
  
  // Structure 2: Converted AnalysisResult format (from HairAnalysisPage)
  const result = report?.result
  const parameters = result?.parameters || []
  const summary = result?.summary || report?.summary
  const overallSeverity = result?.overallSeverity || report?.overallSeverity || overallHealth?.severity || 'N/A'
  
  // Get images from various possible locations
  const images = report?.faceImages || report?.result?.faceImages || []
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Hair Analysis Report</h2>
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
                overallSeverity === 'Mild' ? 'bg-[#d4a574]/10 text-[#b8956a]' :
                overallSeverity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                overallSeverity === 'Severe' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {overallSeverity}
              </span>
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Summary</h3>
              <p className="text-gray-600">{summary}</p>
            </div>
          )}

          {/* Analysis Images */}
          {images && images.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Images</h3>
              <div className={`grid grid-cols-1 ${images.length === 1 ? 'sm:grid-cols-1 max-w-md mx-auto' : images.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
                {images.map((image: string, index: number) => (
                  <div key={index} className="text-center">
                    <img 
                      src={image} 
                      alt={['Front Face', 'Right Side', 'Left Side'][index] || `Image ${index + 1}`} 
                      className="rounded-lg shadow-sm border border-gray-200 aspect-square object-cover w-full" 
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

          {/* Overall Hair Health */}
          {overallHealth && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Overall Hair Health</h3>
              {overallHealth.description && (
                <p className="text-gray-600 mb-2">{overallHealth.description}</p>
              )}
              {overallHealth.rating && (
                <p className="text-sm text-gray-500">Rating: {overallHealth.rating}/10</p>
              )}
            </div>
          )}

          {/* Detailed Analysis - Show configured parameters */}
          {(hairAnalysis || parameters.length > 0) && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analysis</h3>
              <div className="space-y-3">
                {/* Map AI analysis results to configured parameters */}
                {(() => {
                  const potentialIssues = hairAnalysis?.["4. Potential Issues"]
                  const scalpHealth = hairAnalysis?.["2. Scalp Health and Condition"]
                  const hairTexture = hairAnalysis?.["3. Hair Texture and Quality"]
                  
                  // Define the configured parameters and map them to AI analysis data
                  const configuredParameters = [
                    {
                      name: 'Dandruff',
                      description: 'Presence of white or yellowish flakes on the scalp and hair',
                      data: potentialIssues?.dandruff,
                      severity: potentialIssues?.severity,
                      rating: potentialIssues?.rating,
                      notes: potentialIssues?.notes
                    },
                    {
                      name: 'Frizzy Hair',
                      description: 'Hair that appears unruly, lacks smoothness, and has flyaway strands',
                      data: hairTexture ? `${hairTexture.texture || ''} ${hairTexture.quality || ''}`.trim() : null,
                      severity: hairTexture?.severity,
                      rating: hairTexture?.rating,
                      notes: hairTexture?.notes
                    },
                    {
                      name: 'Dry and Damaged Scalp',
                      description: 'Scalp showing signs of dryness, flakiness, tightness, or damage',
                      data: scalpHealth?.dryness_or_oiliness || potentialIssues?.damage,
                      severity: scalpHealth?.severity || potentialIssues?.severity,
                      rating: scalpHealth?.rating || potentialIssues?.rating,
                      notes: scalpHealth?.notes || potentialIssues?.notes
                    },
                    {
                      name: 'Oily Scalp',
                      description: 'Excessive oil production on the scalp making hair appear greasy',
                      data: scalpHealth?.dryness_or_oiliness,
                      severity: scalpHealth?.severity,
                      rating: scalpHealth?.rating,
                      notes: scalpHealth?.notes
                    },
                    {
                      name: 'Itchy Scalp',
                      description: 'Scalp discomfort characterized by itching sensation',
                      data: scalpHealth?.redness_or_irritation,
                      severity: scalpHealth?.severity,
                      rating: scalpHealth?.rating,
                      notes: scalpHealth?.notes
                    }
                  ]
                  
                  return configuredParameters.map((param, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{param.name}</h4>
                        {param.severity && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            param.severity === 'Mild' ? 'bg-[#d4a574]/10 text-[#b8956a]' :
                            param.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            param.severity === 'Severe' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {param.severity}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-2 italic">{param.description}</p>
                      {param.rating && (
                        <p className="text-xs text-gray-500 mb-2">Rating: {param.rating}/10</p>
                      )}
                      {param.data && (
                        <p className="text-sm text-gray-600 mb-2">{param.data}</p>
                      )}
                      {param.notes && (
                        <p className="text-xs text-gray-500 italic">Notes: {param.notes}</p>
                      )}
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {hairAnalysis?.["6. Recommendations for Improvement"] && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
              <div className="space-y-2">
                {Object.entries(hairAnalysis["6. Recommendations for Improvement"]).map(([key, value]: [string, any]) => {
                  if (key === 'rating' || key === 'severity' || key === 'notes') return null
                  return (
                    <div key={key} className="border-l-4 border-purple-500 pl-4">
                      <h4 className="font-medium text-gray-900 capitalize">{key.replace(/_/g, ' ')}</h4>
                      <p className="text-sm text-gray-600">{value}</p>
                    </div>
                  )
                })}
                {hairAnalysis["6. Recommendations for Improvement"].notes && (
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-medium text-gray-900">General Notes</h4>
                    <p className="text-sm text-gray-600">{hairAnalysis["6. Recommendations for Improvement"].notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Routine Recommendations (from converted format) */}
          {result?.routine && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Routines</h3>
              {result.routine.morning && result.routine.morning.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Morning Routine</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {result.routine.morning.map((routine: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-600">{routine}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.routine.evening && result.routine.evening.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Evening Routine</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {result.routine.evening.map((routine: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-600">{routine}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Debug info (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg">
              <details>
                <summary className="cursor-pointer text-sm font-medium text-gray-700">Debug: View Raw Report Data</summary>
                <pre className="mt-2 text-xs overflow-auto max-h-64 bg-white p-2 rounded border">
                  {JSON.stringify(report, null, 2)}
                </pre>
              </details>
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







