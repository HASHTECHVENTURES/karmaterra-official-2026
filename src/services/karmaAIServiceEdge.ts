import { supabase } from '@/lib/supabase'
import { getKnowledgeContext } from '@/services/knowledgeService'

export interface Message {
  id: string
  conversation_id: string
  user_id: string
  content: string
  is_user_message: boolean
  created_at: string
  metadata?: {
    model?: string
    response_time?: number
    tokens?: number
  }
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
  is_archived: boolean
}

export interface UserContext {
  name?: string
  gender?: string
  age?: number
  skinType?: string
  hairType?: string
  recentAnalysis?: any
}

/**
 * KarmaAI Service using Supabase Edge Functions
 */
export class KarmaAIService {
  /**
   * Create a new conversation
   */
  async createConversation(userId: string, title: string = 'New Conversation'): Promise<Conversation | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title,
          is_archived: false,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating conversation:', error)
      return null
    }
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching conversations:', error)
      return []
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching messages:', error)
      return []
    }
  }

  /**
   * Save a message to the database
   */
  async saveMessage(
    conversationId: string,
    userId: string,
    content: string,
    isUserMessage: boolean,
    metadata?: any
  ): Promise<Message | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          content,
          is_user_message: isUserMessage,
          metadata,
        })
        .select()
        .single()

      if (error) throw error

      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)

      return data
    } catch (error) {
      console.error('Error saving message:', error)
      return null
    }
  }

  /**
   * Generate AI response using Edge Function
   */
  async generateResponse(
    userMessage: string,
    conversationHistory: Message[],
    userContext?: UserContext,
    userId?: string
  ): Promise<{ text: string; metadata: any } | null> {
    try {
      // Fetch knowledge base context from database
      const knowledgeContext = await getKnowledgeContext()
      
      if (knowledgeContext) {
        console.log('📚 Knowledge base loaded:', {
          length: knowledgeContext.length,
          preview: knowledgeContext.substring(0, 200) + '...'
        })
      } else {
        console.log('ℹ️ No knowledge base documents found. Upload documents in Admin Panel → AI Knowledge Base')
      }

      // Edge function will fetch API key from database server-side (more secure)
      // We just need to pass userId
      const { data, error } = await supabase.functions.invoke('ask-karma', {
        body: {
          userMessage,
          conversationHistory,
          userContext,
          knowledgeContext, // Knowledge base is automatically included in AI responses
          userId, // Edge function will look up API key from database
        },
      })

      if (error) {
        throw new Error(error.message || 'Failed to generate response')
      }

      if (!data.success) {
        throw new Error(data.error || 'Response generation failed')
      }

      return data.data
    } catch (error: any) {
      console.error('Error generating AI response:', error)
      throw error
    }
  }

  /**
   * Generate a conversation title from the first message
   */
  generateConversationTitle(firstMessage: string): string {
    // Simple title generation - take first 50 chars
    const title = firstMessage.substring(0, 50).trim()
    return title.length < firstMessage.length ? title + '...' : title
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting conversation:', error)
      return false
    }
  }
}

export const karmaAI = new KarmaAIService()


