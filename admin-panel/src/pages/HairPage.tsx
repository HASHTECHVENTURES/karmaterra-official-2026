import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, ShoppingBag, FileQuestion, ArrowUp, ArrowDown, X, Eye, Search, Download, Copy, Grid3x3, List, Filter, BarChart3, Image as ImageIcon, GripVertical } from 'lucide-react'
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

interface HairTypeProduct {
  id: string
  hair_type: string
  product_name: string
  product_description?: string
  product_link?: string
  product_image?: string
  display_order: number
  is_active: boolean
}

// Removed HAIR_TYPES - products are no longer categorized by hair type

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
  const [editingProduct, setEditingProduct] = useState<HairTypeProduct | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'products' | 'questions' | 'reports'>('products')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [showReportDetails, setShowReportDetails] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<HairQuestion | null>(null)
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const queryClient = useQueryClient()
  
  // Products view state
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [productViewMode, setProductViewMode] = useState<'table' | 'grid'>('table')
  const [productFilterStatus, setProductFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [showProductPreview, setShowProductPreview] = useState<HairTypeProduct | null>(null)
  
  // Drag and drop sensors - must be at top level (Rules of Hooks)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const { data: products, isLoading } = useQuery({
    queryKey: ['hair-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hair_type_products')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      return (data as HairTypeProduct[]) || []
    },
  })
  
  // Filter products
  const filteredProducts = products?.filter(product => {
    const matchesSearch = !productSearchTerm || 
      product.product_name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      product.product_description?.toLowerCase().includes(productSearchTerm.toLowerCase())
    
    const matchesStatus = productFilterStatus === 'all' || 
      (productFilterStatus === 'active' && product.is_active) ||
      (productFilterStatus === 'inactive' && !product.is_active)
    
    return matchesSearch && matchesStatus
  }) || []
  
  // Calculate stats
  const productStats = {
    total: products?.length || 0,
    active: products?.filter(p => p.is_active).length || 0,
    inactive: products?.filter(p => !p.is_active).length || 0,
  }

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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hair_type_products').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hair-products'] })
      toast.success('Product deleted successfully')
      setSelectedProducts(new Set())
    },
  })
  
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('hair_type_products').delete().in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hair-products'] })
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
        .from('hair_type_products')
        .update({ is_active: !isActive })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hair-products'] })
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
        .from('hair_type_products')
        .update({ is_active: !isActive })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hair-products'] })
      toast.success('Product status updated')
    },
  })
  
  const duplicateMutation = useMutation({
    mutationFn: async (product: HairTypeProduct) => {
      const { data, error } = await supabase
        .from('hair_type_products')
        .insert({
          hair_type: product.hair_type,
          product_name: `${product.product_name} (Copy)`,
          product_description: product.product_description,
          product_link: product.product_link,
          product_image: product.product_image,
          display_order: (products?.length || 0) + 1,
          is_active: false,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hair-products'] })
      toast.success('Product duplicated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to duplicate product')
    },
  })
  
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase
        .from('hair_type_products')
        .update({ display_order: newOrder })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hair-products'] })
    },
  })
  
  const handleMoveUp = (index: number) => {
    if (index === 0 || !filteredProducts) return
    const product = filteredProducts[index]
    const prevProduct = filteredProducts[index - 1]
    updateOrderMutation.mutate({ id: product.id, newOrder: prevProduct.display_order })
    updateOrderMutation.mutate({ id: prevProduct.id, newOrder: product.display_order })
  }
  
  const handleMoveDown = (index: number) => {
    if (!filteredProducts || index === filteredProducts.length - 1) return
    const product = filteredProducts[index]
    const nextProduct = filteredProducts[index + 1]
    updateOrderMutation.mutate({ id: product.id, newOrder: nextProduct.display_order })
    updateOrderMutation.mutate({ id: nextProduct.id, newOrder: product.display_order })
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
      const overallHealth = report?.hair_analysis?.["Overall Hair Health"]
      const severity = overallHealth?.severity || 'N/A'
      
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
      doc.text(`Severity: ${severity}`, margin, yPos)
      yPos += 10
      
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
      
      // Overall Health
      if (overallHealth) {
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
      
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }
      
      // Detailed Analysis
      if (report?.hair_analysis) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Detailed Analysis', margin, yPos)
        yPos += 7
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        
        Object.entries(report.hair_analysis).forEach(([key, value]: [string, any]) => {
          if (key === "Overall Hair Health" || key === "6. Recommendations for Improvement") return
          
          // Check if we need a new page
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }
          
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
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
          if (value.rating) {
            doc.text(`Rating: ${value.rating}/10`, margin, yPos)
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
      
      // Recommendations
      if (report?.hair_analysis?.["6. Recommendations for Improvement"]) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Recommendations', margin, yPos)
        yPos += 7
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        
        Object.entries(report.hair_analysis["6. Recommendations for Improvement"]).forEach(([key, value]: [string, any]) => {
          // Check if we need a new page
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
      
      // Save PDF
      const fileName = `hair-report-${analysis.id}-${new Date(analysis.created_at).toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      toast.success('Report downloaded as PDF successfully')
    } catch (error: any) {
      console.error('PDF generation error:', error)
      toast.error('Failed to download report: ' + error.message)
    }
  }

  // Fetch hair reports
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['hair-reports', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('analysis_history')
        .select('*')
        .eq('analysis_type', 'hair')
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      // Get user profiles for each analysis
      const reportsWithUsers = await Promise.all(
        (data || []).map(async (item: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', item.user_id)
            .single()

          // Filter by search term if provided
          const matchesSearch = !searchTerm || 
            profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            profile?.email?.toLowerCase().includes(searchTerm.toLowerCase())

          if (!matchesSearch && searchTerm) return null

          return {
            ...item,
            user: profile || null
          }
        })
      )

      return reportsWithUsers.filter(Boolean)
    },
    enabled: activeTab === 'reports',
  })

  if (isLoading && activeTab !== 'reports') {
    return <div className="text-center py-12">Loading products...</div>
  }

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

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Product Management</h2>
            <button
              onClick={() => {
                setEditingProduct(null)
                setShowAddForm(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          </div>

          {showAddForm && (
            <HairProductForm
              product={editingProduct}
              onClose={() => {
                setShowAddForm(false)
                setEditingProduct(null)
              }}
              onSuccess={() => {
                setShowAddForm(false)
                setEditingProduct(null)
                queryClient.invalidateQueries({ queryKey: ['hair-products'] })
              }}
            />
          )}

          {/* Quick Stats Dashboard */}
          {products && products.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Total Products</p>
                    <p className="text-2xl font-bold text-purple-900">{productStats.total}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-500" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#d4a574] font-medium">Active</p>
                    <p className="text-2xl font-bold text-green-900">{productStats.active}</p>
                  </div>
                  <ShoppingBag className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Inactive</p>
                    <p className="text-2xl font-bold text-gray-900">{productStats.inactive}</p>
                  </div>
                  <X className="w-8 h-8 text-gray-500" />
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            {/* Header with Search, Filters, and View Toggle */}
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">All Hair Products</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {filteredProducts.length} of {products?.length || 0} product(s) shown
                      {selectedProducts.size > 0 && (
                        <span className="ml-2 text-purple-600 font-medium">
                          ({selectedProducts.size} selected)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-300 p-1">
                      <button
                        onClick={() => setProductViewMode('table')}
                        className={`p-2 rounded ${productViewMode === 'table' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}
                        title="Table View"
                      >
                        <List className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setProductViewMode('grid')}
                        className={`p-2 rounded ${productViewMode === 'grid' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}
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
                              products?.find(p => p.id === id)?.is_active
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
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search products by name or description..."
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <select
                      value={productFilterStatus}
                      onChange={(e) => setProductFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive Only</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  {productSearchTerm || productFilterStatus !== 'all' 
                    ? 'No products match your filters' 
                    : 'No products configured yet'}
                </p>
                {productSearchTerm && (
                  <button 
                    onClick={() => {
                      setProductSearchTerm('')
                      setProductFilterStatus('all')
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 mr-2"
                  >
                    Clear Filters
                  </button>
                )}
                {!productSearchTerm && (!products || products.length === 0) && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add First Product
                  </button>
                )}
              </div>
            ) : productViewMode === 'table' ? (
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
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product, index) => {
                    const originalIndex = products?.findIndex(p => p.id === product.id) || 0
                    return (
                      <tr 
                        key={product.id} 
                        className={`${!product.is_active ? 'opacity-50' : ''} ${selectedProducts.has(product.id) ? 'bg-purple-50' : ''}`}
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
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleMoveUp(index)}
                              disabled={originalIndex === 0}
                              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-medium text-gray-900">{product.display_order}</span>
                            <button
                              onClick={() => handleMoveDown(index)}
                              disabled={originalIndex === (products?.length || 0) - 1}
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
                                onClick={() => setShowProductPreview(product)}
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
                              onClick={() => setShowProductPreview(product)} 
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
                              onClick={() => {
                                setEditingProduct(product)
                                setShowAddForm(true)
                              }} 
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
                        selectedProducts.has(product.id) ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:shadow-md'
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
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                          onClick={() => setShowProductPreview(product)}
                          className="w-full mb-3 relative group"
                        >
                          <img
                            src={product.product_image}
                            alt={product.product_name}
                            className="w-full h-48 object-contain bg-gray-50 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
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
                      
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                        <span className="text-xs text-gray-500">Order: {product.display_order}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowProductPreview(product)}
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
                            onClick={() => {
                              setEditingProduct(product)
                              setShowAddForm(true)
                            }}
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
            {showProductPreview && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowProductPreview(null)}>
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900">Product Preview</h3>
                      <button
                        onClick={() => setShowProductPreview(null)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    
                    {showProductPreview.product_image && (
                      <div className="mb-4">
                        <img
                          src={showProductPreview.product_image}
                          alt={showProductPreview.product_name}
                          className="w-full h-64 object-contain bg-gray-50 rounded-lg"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Product Name</label>
                        <p className="text-lg font-semibold text-gray-900">{showProductPreview.product_name}</p>
                      </div>
                      
                      {showProductPreview.product_description && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Description</label>
                          <p className="text-gray-600">{showProductPreview.product_description}</p>
                        </div>
                      )}
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Status</label>
                        <p className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          showProductPreview.is_active ? 'bg-[#d4a574]/10 text-[#b8956a]' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {showProductPreview.is_active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      
                      {showProductPreview.product_link && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Product Link</label>
                          <a
                            href={showProductPreview.product_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-800 break-all"
                          >
                            {showProductPreview.product_link}
                          </a>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setShowProductPreview(null)
                          setEditingProduct(showProductPreview)
                          setShowAddForm(true)
                        }}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Edit Product
                      </button>
                      <button
                        onClick={() => setShowProductPreview(null)}
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
        </div>
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

          {reportsLoading ? (
            <div className="text-center py-12">Loading reports...</div>
          ) : reports && reports.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overall Health</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((analysis: any) => {
                    const report = analysis.analysis_result
                    const overallHealth = report?.hair_analysis?.["Overall Hair Health"]
                    const severity = overallHealth?.severity || 'N/A'
                    const description = overallHealth?.description || 'No description available'
                    
                    return (
                      <tr key={analysis.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {analysis.user?.full_name || analysis.user?.email || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            severity === 'Mild' ? 'bg-[#d4a574]/10 text-[#b8956a]' :
                            severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            severity === 'Severe' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {severity}
                          </span>
                        </td>
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
  product: HairTypeProduct | null
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
  const overallHealth = report?.hair_analysis?.["Overall Hair Health"]
  const severity = overallHealth?.severity || 'N/A'
  
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
                severity === 'Mild' ? 'bg-[#d4a574]/10 text-[#b8956a]' :
                severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                severity === 'Severe' ? 'bg-red-100 text-red-800' :
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

          {report?.hair_analysis && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analysis</h3>
              <div className="space-y-3">
                {Object.entries(report.hair_analysis).map(([key, value]: [string, any]) => {
                  if (key === "Overall Hair Health" || key === "6. Recommendations for Improvement") return null
                  
                  return (
                    <div key={key} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{key}</h4>
                        {value.severity && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            value.severity === 'Mild' ? 'bg-[#d4a574]/10 text-[#b8956a]' :
                            value.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            value.severity === 'Severe' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {value.severity}
                          </span>
                        )}
                      </div>
                      {value.description && (
                        <p className="text-sm text-gray-600">{value.description}</p>
                      )}
                      {value.rating && (
                        <p className="text-xs text-gray-500 mt-1">Rating: {value.rating}/10</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {report?.hair_analysis?.["6. Recommendations for Improvement"] && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
              <div className="space-y-2">
                {Object.entries(report.hair_analysis["6. Recommendations for Improvement"]).map(([key, value]: [string, any]) => (
                  <div key={key} className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-medium text-gray-900 capitalize">{key.replace(/_/g, ' ')}</h4>
                    <p className="text-sm text-gray-600">{value}</p>
                  </div>
                ))}
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




