import { supabase } from '@/lib/supabase'

export interface HairQuestion {
  id: string
  question_text: string
  question_type: 'single_choice' | 'multiple_choice' | 'text'
  answer_options?: string[]
  display_order: number
  is_required: boolean
  is_active: boolean
  icon_name?: string
  help_text?: string
}

/**
 * Fetch all active hair questions ordered by display_order
 */
export async function getHairQuestions(): Promise<HairQuestion[]> {
  try {
    const { data, error } = await supabase
      .from('hair_questions')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching hair questions:', error)
      return []
    }

    // Parse JSONB answer_options
    return ((data || []) as any[]).map((q) => ({
      ...q,
      answer_options: q.answer_options
        ? Array.isArray(q.answer_options)
          ? q.answer_options
          : typeof q.answer_options === 'string'
          ? JSON.parse(q.answer_options)
          : []
        : [],
    })) as HairQuestion[]
  } catch (error) {
    console.error('Error fetching hair questions:', error)
    return []
  }
}


