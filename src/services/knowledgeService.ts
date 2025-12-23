import { supabase } from '@/lib/supabase'

export interface KnowledgeDocument {
  id: string
  title: string
  category: string | null
  file_url: string
  file_type: string
  extracted_text: string | null
  created_at: string
  updated_at: string
}

/**
 * Get all knowledge documents
 */
export async function getAllKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  try {
    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('*')
      .order('category', { ascending: true })
      .order('title', { ascending: true })

    if (error) {
      console.error('Error fetching knowledge documents:', error)
      return []
    }

    return (data || []) as KnowledgeDocument[]
  } catch (error) {
    console.error('Error fetching knowledge documents:', error)
    return []
  }
}

/**
 * Get knowledge documents by category
 */
export async function getKnowledgeDocumentsByCategory(category: string): Promise<KnowledgeDocument[]> {
  try {
    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('category', category)
      .order('title', { ascending: true })

    if (error) {
      console.error('Error fetching knowledge documents by category:', error)
      return []
    }

    return (data || []) as KnowledgeDocument[]
  } catch (error) {
    console.error('Error fetching knowledge documents by category:', error)
    return []
  }
}

/**
 * Get extracted text from all knowledge documents for AI context
 */
export async function getKnowledgeContext(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('title, extracted_text, category')
      .not('extracted_text', 'is', null)

    if (error) {
      console.error('Error fetching knowledge context:', error)
      return ''
    }

    if (!data || data.length === 0) {
      return ''
    }

    // Combine all knowledge into a context string
    let context = 'Karma Terra Knowledge Base:\n\n'
    data.forEach((doc: any) => {
      context += `[${doc.category || 'General'}] ${doc.title}:\n`
      context += `${doc.extracted_text}\n\n`
    })

    return context
  } catch (error) {
    console.error('Error fetching knowledge context:', error)
    return ''
  }
}




