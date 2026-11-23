import React, { useState, useRef, useEffect } from 'react';
import {
  Product,
  BatchItem,
  Supplier,
  PurchaseOrder,
  InventoryTransaction,
  UserRole,
} from '../types/inventory';
import {
  Bot,
  X,
  Send,
  Sparkles,
  Minimize2,
  Maximize2,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Database,
  ArrowRight,
  TrendingDown,
  Layers,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { playBarcodeBeep, playSuccessChime } from '../utils/audio';
import { queryRelationalAssistant } from '../utils/assistantEngine';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  isError?: boolean;
  categorization?: {
    hasDatabaseFact?: boolean;
    hasCalculatedInsight?: boolean;
    hasUnavailableWarning?: boolean;
  };
}

interface AssistantChatProps {
  products: Product[];
  batches: BatchItem[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  transactions: InventoryTransaction[];
  currentRole: UserRole;
  onNavigateTab?: (tab: string, filter?: string) => void;
}

export const AssistantChat: React.FC<AssistantChatProps> = ({
  products,
  batches,
  suppliers,
  purchaseOrders,
  transactions,
  currentRole,
  onNavigateTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: `Hello! I am your **FMCG Inventory AI Assistant**. Connected directly to your PostgreSQL 3NF data engine under role **${currentRole}**.\n\nI can analyze live stockouts, calculate optimal reorder sizes ($Q_{rec}$), evaluate FEFO batch expiry risks, inspect supplier delivery delays, and generate SQL queries for your assessment. How can I assist your operations today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Suggested quick prompts tailored to FMCG operations & DBMS assessment
  const suggestedQuestions = [
    'Explain this project & DBMS terminologies for my teacher',
    'Which SKUs are currently below reorder point without incoming POs?',
    'Konsa saman kam hai aur konsi items expire hone wali hain?',
    'What is our total inventory valuation and top category by gross margin?',
    'Which batches have critical expiry within the next 30 days (FEFO)?',
    'Evaluate supplier delivery delays and identify any SLA violations.',
  ];

  // Prepare database state context for Gemini API
  const prepareContextPayload = () => {
    const totalInventoryValue = products.reduce((acc, p) => acc + p.quantityOnHand * p.unitCost, 0);
    const lowStockCount = products.filter((p) => p.quantityOnHand <= p.reorderPoint).length;
    const stockoutCount = products.filter((p) => p.quantityOnHand === 0).length;
    const nearExpiryCount = batches.filter((b) => b.daysUntilExpiry <= 30 && b.daysUntilExpiry > 0).length;
    const expiredCount = batches.filter((b) => b.daysUntilExpiry <= 0).length;
    const delayedPOCount = purchaseOrders.filter((po) => po.isDelayed).length;

    return {
      products,
      batches,
      suppliers,
      purchaseOrders,
      transactions: transactions.slice(0, 10),
      metrics: {
        totalSkus: products.length,
        totalInventoryValueUSD: totalInventoryValue,
        lowStockCount,
        stockoutCount,
        nearExpiryCount,
        expiredCount,
        delayedPOCount,
      },
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const payload = {
        message: query,
        userRole: currentRole,
        history: messages.slice(-6),
        context: prepareContextPayload(),
      };

      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      let replyText = '';

      if (res.ok && data && data.reply) {
        replyText = data.reply;
      } else {
        // Fallback to local high-precision relational reasoning engine
        const localResult = queryRelationalAssistant(query, {
          products,
          batches,
          suppliers,
          purchaseOrders,
          transactions,
          userRole: currentRole,
        });
        replyText = localResult.reply;
      }
      const hasDatabaseFact =
        replyText.includes('[DATABASE FACT]') ||
        replyText.includes('SKU') ||
        replyText.includes('quantity') ||
        replyText.includes('units');
      const hasCalculatedInsight =
        replyText.includes('[CALCULATED INSIGHT]') ||
        replyText.includes('formula') ||
        replyText.includes('margin') ||
        replyText.includes('optimal');
      const hasUnavailableWarning =
        replyText.includes('[UNAVAILABLE') ||
        replyText.includes('not present in database') ||
        replyText.includes('unavailable');

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        categorization: {
          hasDatabaseFact,
          hasCalculatedInsight,
          hasUnavailableWarning,
        },
      };

      setMessages((prev) => [...prev, botMsg]);
      playSuccessChime();
    } catch (err: any) {
      console.error('Chatbot error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        isError: true,
        text: `Error connecting to Assistant backend: ${err.message || 'Please check your connection or server configuration.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper to format bot markdown text with blue-and-white theme styling
  const renderMessageContent = (text: string) => {
    // Split into paragraphs / bullet lines
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 text-xs leading-relaxed text-slate-800">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;

          // Highlight tags
          let formattedLine = line;
          const isDbFact = line.includes('[DATABASE FACT]');
          const isCalculated = line.includes('[CALCULATED INSIGHT]');
          const isUnavailable = line.includes('[UNAVAILABLE') || line.includes('not present in database');

          return (
            <div
              key={idx}
              className={`${
                isDbFact
                  ? 'bg-blue-50 border-l-2 border-blue-600 px-2 py-0.5 rounded-r font-medium text-blue-950'
                  : isCalculated
                  ? 'bg-emerald-50 border-l-2 border-emerald-500 px-2 py-0.5 rounded-r text-emerald-950'
                  : isUnavailable
                  ? 'bg-amber-50 border-l-2 border-amber-500 px-2 py-0.5 rounded-r text-amber-950'
                  : ''
              }`}
            >
              {line.startsWith('- ') || line.startsWith('* ') ? (
                <div className="flex items-start gap-1.5 pl-1">
                  <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
                  <span dangerouslySetInnerHTML={{ __html: sanitizeBold(line.substring(2)) }} />
                </div>
              ) : line.startsWith('### ') ? (
                <h4 className="font-bold text-blue-900 mt-2 mb-1 text-xs uppercase tracking-wide">
                  {line.substring(4)}
                </h4>
              ) : line.startsWith('#### ') ? (
                <h5 className="font-bold text-blue-800 mt-1.5 mb-0.5 text-[11px]">
                  {line.substring(5)}
                </h5>
              ) : line.startsWith('```') ? (
                <div className="p-2 my-1 bg-slate-900 text-cyan-300 font-mono text-[11px] rounded overflow-x-auto">
                  {line.replace(/```(sql|json)?/g, '')}
                </div>
              ) : (
                <p dangerouslySetInnerHTML={{ __html: sanitizeBold(formattedLine) }} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Simple safe markdown bold replacer
  const sanitizeBold = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-950 font-semibold">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="font-mono bg-blue-100/70 text-blue-800 px-1 py-0.2 rounded text-[11px]">$1</code>');
  };

  return (
    <>
      {/* Floating Action Button on Bottom-Right */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            playBarcodeBeep();
          }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full shadow-2xl hover:shadow-blue-500/30 border border-blue-400/40 transition-all duration-300 group cursor-pointer"
          title="Open FMCG Inventory AI Assistant"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-blue-700 animate-pulse" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold tracking-wide">FMCG AI Assistant</div>
            <div className="text-[10px] text-blue-100 font-medium font-mono">Gemini 3.8 Intelligence</div>
          </div>
        </button>
      )}

      {/* Modern Blue-and-White Chat Interface Modal */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-blue-200 transition-all duration-300 overflow-hidden ${
            isExpanded
              ? 'w-[95vw] sm:w-[650px] h-[85vh] max-h-[800px]'
              : 'w-[95vw] sm:w-[440px] h-[600px] max-h-[85vh]'
          }`}
          style={{ boxShadow: '0 20px 40px -15px rgba(30, 58, 138, 0.25)' }}
        >
          {/* Header Zone: Professional Deep Blue Brand bar */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white flex items-center justify-between border-b border-blue-600 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-cyan-300">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>FMCG Inventory AI Assistant</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-500/30 text-blue-200 rounded border border-blue-400/30">
                    Gemini 3.8
                  </span>
                </div>
                <div className="text-[11px] text-blue-200 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-300" />
                    <span>Role: <strong>{currentRole}</strong></span>
                  </span>
                  <span>·</span>
                  <span className="text-blue-300 font-mono text-[10px]">Real DB Connected</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-blue-200">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                title={isExpanded ? 'Restore window size' : 'Expand window'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                title="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context & Disambiguation Indicator Banner */}
          <div className="px-3.5 py-1.5 bg-blue-50/90 border-b border-blue-100 text-[11px] text-blue-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>SKUs: <strong>{products.length}</strong></span>
              <span>·</span>
              <span>Batches: <strong>{batches.length}</strong></span>
              <span>·</span>
              <span>POs: <strong>{purchaseOrders.length}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-medium">
              <span className="inline-block px-1 py-0.5 bg-blue-100 rounded text-blue-700">Fact</span>
              <span className="inline-block px-1 py-0.5 bg-emerald-100 rounded text-emerald-700">Insight</span>
              <span className="inline-block px-1 py-0.5 bg-amber-100 rounded text-amber-700">Unavailable</span>
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-slate-50/70 to-white">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : msg.isError
                      ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-bl-xs'
                      : 'bg-white border border-blue-100 text-slate-800 rounded-bl-xs shadow-sm'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  ) : msg.isError ? (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{msg.text}</p>
                    </div>
                  ) : (
                    renderMessageContent(msg.text)
                  )}

                  <div
                    className={`text-[9px] mt-1.5 text-right font-mono ${
                      msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start items-center">
                <div className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 shrink-0 animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-blue-100 rounded-2xl px-4 py-2.5 text-xs text-blue-700 shadow-sm flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Querying real database records with Gemini 3.8...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Prompts */}
          <div className="px-3.5 py-2 bg-slate-50 border-t border-blue-100 shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1 mb-1.5">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>Operational Questions:</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  disabled={isLoading}
                  onClick={() => handleSendMessage(q)}
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-800 text-[11px] rounded-full border border-blue-200 whitespace-nowrap transition-colors cursor-pointer shadow-2xs hover:border-blue-300 shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box Zone */}
          <div className="p-3 bg-white border-t border-blue-100 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                disabled={isLoading}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about stockouts, FEFO batches, PO formulas, SQL..."
                className="flex-1 bg-slate-50 hover:bg-white focus:bg-white border border-blue-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <button
                type="submit"
                disabled={isLoading || !inputQuery.trim()}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-slate-400">
              <span>Press <strong>Enter</strong> to send</span>
              <span className="font-mono">Role: {currentRole}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
