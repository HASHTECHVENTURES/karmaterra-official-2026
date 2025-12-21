import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Send, MessageSquare, Trash2, Menu, X, History, Flag } from "lucide-react";
import { AndroidPageHeader } from "../components/AndroidBackButton";
import { useAuth } from "@/App";
import { karmaAI, type Message as AIMessage, type Conversation } from "@/services/karmaAIServiceEdge";
import { useToast } from "@/hooks/use-toast";
import ServiceReportModal from "../components/ServiceReportModal";

interface DisplayMessage {
  id: string;
  content: string;
  is_user_message: boolean;
  created_at: string;
}

const AskKarmaPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load user's conversations on mount
  useEffect(() => {
    if (user?.id) {
      loadConversations();
    }
  }, [user?.id]);

  const loadConversations = async () => {
    if (!user?.id) return;
    
    setIsLoadingConversations(true);
    const convos = await karmaAI.getConversations(user.id);
    setConversations(convos);
    setIsLoadingConversations(false);

    // If there are no conversations, show welcome message
    if (convos.length === 0) {
      showWelcomeMessage();
    }
  };

  const showWelcomeMessage = () => {
    const welcomeMsg: DisplayMessage = {
      id: 'welcome',
      content: `Hi ${user?.name || 'there'}! 👋

I'm Karma Terra AI, your personal skincare and wellness assistant. I'm here to help you with:

• Personalized skincare advice
• Hair care recommendations
• Product ingredient analysis
• Beauty and wellness tips
• Answers to all your beauty questions

Feel free to ask me anything!`,
      is_user_message: false,
      created_at: new Date().toISOString()
    };
    setMessages([welcomeMsg]);
  };

  const loadConversation = async (conversation: Conversation) => {
    setCurrentConversation(conversation);
    const msgs = await karmaAI.getMessages(conversation.id);
    
    // Convert to display format
    const displayMsgs: DisplayMessage[] = msgs.map(msg => ({
      id: msg.id,
      content: msg.content,
      is_user_message: msg.is_user_message,
      created_at: msg.created_at
    }));
    
    setMessages(displayMsgs);
    setShowSidebar(false);
  };

  const startNewConversation = () => {
    setCurrentConversation(null);
    showWelcomeMessage();
    setShowSidebar(false);
  };

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const success = await karmaAI.deleteConversation(conversationId);
    if (success) {
      toast({
        title: "Conversation deleted",
        description: "The conversation has been removed.",
      });
      
      // Reload conversations
      await loadConversations();
      
      // If we deleted the current conversation, start a new one
      if (currentConversation?.id === conversationId) {
        startNewConversation();
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to delete conversation.",
        variant: "destructive"
      });
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading || !user?.id) return;

    const userMessageContent = inputText;
    setInputText("");
    setIsLoading(true);

    try {
      // Create new conversation if needed
      let conversationId = currentConversation?.id;
      
      if (!conversationId) {
        const title = karmaAI.generateConversationTitle(userMessageContent);
        const newConvo = await karmaAI.createConversation(user.id, title);
        
        if (!newConvo) {
          throw new Error('Failed to create conversation');
        }
        
        conversationId = newConvo.id;
        setCurrentConversation(newConvo);
        
        // Reload conversations list
        loadConversations();
      }

      // Add user message to UI immediately
      const tempUserMessage: DisplayMessage = {
        id: `temp-${Date.now()}`,
        content: userMessageContent,
        is_user_message: true,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev.filter(m => m.id !== 'welcome'), tempUserMessage]);

      // Save user message to database
      await karmaAI.saveMessage(conversationId, user.id, userMessageContent, true);

      // Get conversation history for context
      const conversationHistory = await karmaAI.getMessages(conversationId);
      
      // Build user context
      const userContext = {
        name: user.name,
        gender: user.gender,
        age: user.birthdate ? new Date().getFullYear() - new Date(user.birthdate).getFullYear() : undefined
      };

      // Generate AI response
      const aiResponse = await karmaAI.generateResponse(
        userMessageContent,
        conversationHistory,
        userContext,
        user?.id // Pass user ID to use their API key if available
      );

      if (!aiResponse) {
        throw new Error('Failed to generate response');
      }

      // Save AI message to database
      const savedAiMessage = await karmaAI.saveMessage(
        conversationId,
        user.id,
        aiResponse.text,
        false,
        aiResponse.metadata
      );

      if (savedAiMessage) {
        // Add AI message to UI
        const aiMsg: DisplayMessage = {
          id: savedAiMessage.id,
          content: aiResponse.text,
          is_user_message: false,
          created_at: savedAiMessage.created_at
        };
        setMessages(prev => [...prev, aiMsg]);
      }

      // Update conversations list to reflect new activity
      loadConversations();

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMsg: DisplayMessage = {
        id: `error-${Date.now()}`,
        content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        is_user_message: false,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
      
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageContent = (content: string) => {
    // Clean up any potential formatting issues
    let cleanContent = content
      .replace(/\*\*\s*[{\[\(]/g, '') // Remove broken markdown
      .replace(/[}\]\)]\s*\*\*/g, '') // Remove broken markdown
      .replace(/\*\*\*+/g, '') // Remove multiple asterisks
      .replace(/\n{3,}/g, '\n\n'); // Max 2 line breaks
    
    // Split by double newlines for paragraphs
    const paragraphs = cleanContent.split('\n\n');
    
    return paragraphs.map((para, idx) => {
      const trimmedPara = para.trim();
      if (!trimmedPara) return null;
      
      // Check if it's a bullet list
      if (trimmedPara.includes('•') || trimmedPara.includes('- ') || trimmedPara.match(/^\d+\./m)) {
        const lines = trimmedPara.split('\n').filter(line => line.trim());
        return (
          <div key={idx} className="mb-3 space-y-1">
            {lines.map((line, lineIdx) => {
              const cleanLine = line.trim();
              if (!cleanLine) return null;
              return (
                <div key={lineIdx} className="flex items-start gap-2">
                  {cleanLine.startsWith('•') || cleanLine.startsWith('-') ? (
                    <>
                      <span className="text-green-600 font-bold mt-0.5">•</span>
                      <span className="flex-1">{cleanLine.replace(/^[•\-]\s*/, '')}</span>
                    </>
                  ) : cleanLine.match(/^\d+\./) ? (
                    <span className="flex-1">{cleanLine}</span>
                  ) : (
                    <span className="flex-1">{cleanLine}</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      }
      
      // Regular paragraph
      return (
        <p key={idx} className="mb-3 last:mb-0 leading-relaxed">
          {trimmedPara}
        </p>
      );
    }).filter(Boolean);
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar - Conversation History */}
      <div
        className={`fixed lg:relative inset-y-0 left-0 z-30 w-72 bg-gray-50 border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col safe-area-top">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Conversations</h2>
            <button
              onClick={() => setShowSidebar(false)}
              className="lg:hidden text-gray-600 hover:bg-gray-200 p-1 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-3">
            <button
              onClick={startNewConversation}
              className="w-full flex items-center justify-center gap-2 bg-karma-gold hover:bg-karma-gold/90 text-white py-2.5 px-4 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">New Chat</span>
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoadingConversations ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No conversations yet.<br />Start a new chat!
              </div>
            ) : (
              conversations.map((convo) => (
                <div
                  key={convo.id}
                  onClick={() => loadConversation(convo)}
                  className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    currentConversation?.id === convo.id
                      ? 'bg-green-100 border border-green-300'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 line-clamp-2 break-words">
                      {convo.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(convo.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(convo.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 p-1.5 rounded transition-opacity"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Android Material Design Header */}
        <AndroidPageHeader
          title={currentConversation ? currentConversation.title : 'Karma Terra AI'}
          subtitle="Your AI Beauty Assistant"
          backTo="/"
          rightContent={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReportModal(true)}
                className="text-gray-600 hover:bg-gray-100 p-2 rounded-lg min-h-[48px] min-w-[48px] flex items-center justify-center transition-colors"
                aria-label="Report issue"
                title="Report issue"
              >
                <Flag className="w-5 h-5" strokeWidth={2} />
              </button>
              <button
                onClick={() => setShowSidebar(true)}
                className="text-gray-600 hover:bg-gray-100 p-2 rounded-lg min-h-[48px] min-w-[48px] flex items-center justify-center transition-colors"
                aria-label="Open chat history"
                title="Chat history"
              >
                <History className="w-6 h-6" strokeWidth={2} />
              </button>
            </div>
          }
        />
        
        {/* Report Modal */}
        <ServiceReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          serviceName="ask_karma"
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.is_user_message ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.is_user_message
                    ? 'bg-karma-gold text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="text-sm leading-relaxed">
                  {message.is_user_message ? (
                    <p>{message.content}</p>
                  ) : (
                    formatMessageContent(message.content)
                  )}
                </div>
                <div
                  className={`text-xs mt-2 ${
                    message.is_user_message ? 'text-green-100' : 'text-gray-500'
                  }`}
                >
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-karma-gold rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-karma-gold rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-karma-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">Karma is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0 bg-white safe-area-bottom content-safe-area">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about skincare, hair care, or wellness..."
                className="w-full resize-none border border-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={1}
                style={{
                  minHeight: '48px',
                  maxHeight: '120px'
                }}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!inputText.trim() || isLoading}
              aria-label="Send message"
              title="Send message"
              className="bg-karma-gold hover:bg-karma-gold/90 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 rounded-full transition-colors flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            Karma Terra AI can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AskKarmaPage;
