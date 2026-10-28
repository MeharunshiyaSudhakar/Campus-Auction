import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import {
  MessageSquare,
  Sparkles,
  X,
  Send,
  Bot,
  User,
  ChevronDown,
  RotateCcw,
  Zap,
  Shield,
  HelpCircle,
  Mail,
  Gavel,
  CheckCircle2,
} from 'lucide-react';

const STARTER_PROMPTS = [
  {
    icon: <Gavel className="w-3.5 h-3.5 text-amber" />,
    text: "What's the best bidding strategy?",
  },
  {
    icon: <Zap className="w-3.5 h-3.5 text-amber" />,
    text: "How does the anti-sniping timer work?",
  },
  {
    icon: <Mail className="w-3.5 h-3.5 text-amber" />,
    text: "When will I get email notifications?",
  },
  {
    icon: <Shield className="w-3.5 h-3.5 text-amber" />,
    text: "How does the 6-digit handover code work?",
  },
  {
    icon: <HelpCircle className="w-3.5 h-3.5 text-amber" />,
    text: "What payment methods are supported?",
  },
];

export default function AiChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "👋 **Hi! I'm your Campus Auction AI Assistant.**\n\nI'm powered by Groq to help you with:\n- 🎯 **Bidding strategies** & ceiling prices\n- ⏱️ **Anti-sniping 30s timer extensions**\n- 📧 **Instant email & in-app notifications**\n- 🤝 **6-digit handover verification codes**\n\nHow can I help you today?",
      source: 'groq',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setLoading(true);

    try {
      const history = updatedMessages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.post('/assistant/chat', {
        message: text,
        history,
      });

      if (res.data?.success && res.data.data) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.data.data.reply,
            source: res.data.data.source || 'groq',
          },
        ]);
      } else {
        throw new Error('Invalid response');
      }
    } catch (err) {
      console.error('AI assistant error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "⚠️ I had trouble connecting to the AI service. Don't worry! Here are quick key facts:\n- **Anti-sniping**: Bids in final 30s add 30s more.\n- **Email alerts**: Outbid notices and deal approvals are sent immediately to your email.\n- **Handover code**: Secret 6-digit code protects your campus item pickup.",
          source: 'fallback',
        },
      ]);
    } finally {
      setLoading(false);
      if (!isOpen) {
        setHasUnread(true);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          "✨ Chat cleared! What else would you like to know about Campus Auction or bidding rules?",
        source: 'groq',
      },
    ]);
  };

  // Helper to format simple markdown (bold, bullet points, headers)
  const formatMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="font-bold text-forest text-sm mt-2 mb-1">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ') || line.startsWith('# ')) {
        return <h3 key={idx} className="font-extrabold text-forest text-sm sm:text-base mt-2 mb-1">{line.replace(/^#+\s/, '')}</h3>;
      }
      // Bullet list items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const bulletText = line.substring(2);
        return (
          <div key={idx} className="flex items-start gap-1.5 my-1 text-xs sm:text-sm pl-1">
            <span className="text-amber font-black leading-tight">&bull;</span>
            <span>{renderFormattedInline(bulletText)}</span>
          </div>
        );
      }
      // Numbered list items
      if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+\.)\s(.*)/);
        return (
          <div key={idx} className="flex items-start gap-1.5 my-1 text-xs sm:text-sm pl-1">
            <span className="text-forest font-bold text-xs">{match[1]}</span>
            <span>{renderFormattedInline(match[2])}</span>
          </div>
        );
      }
      // Blank lines
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      // Regular paragraph
      return (
        <p key={idx} className="text-xs sm:text-sm leading-relaxed my-1">
          {renderFormattedInline(line)}
        </p>
      );
    });
  };

  // Renders bold (**text**) and code (`text`) inline
  const renderFormattedInline = (str) => {
    const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-forest">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1 py-0.5 rounded bg-sage/20 text-forest text-[11px] font-mono">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Widget Launcher Button (Bottom Right) */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open Campus AI Assistant Chat"
            className="group relative flex items-center gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full bg-charcoal hover:bg-charcoal-hover text-warm-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-sage cursor-pointer"
          >
            {/* Glowing / Pulse Badge */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber"></span>
            </span>

            <div className="flex items-center gap-1.5 font-heading font-black text-xs sm:text-sm tracking-wide">
              <Sparkles className="w-4 h-4 text-amber animate-pulse" />
              <span>Campus AI</span>
            </div>

            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-warm-white"></span>
            )}
          </button>
        )}
      </div>

      {/* Chat Window Modal / Sheet */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 flex flex-col justify-end sm:justify-start pointer-events-none">
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs sm:hidden pointer-events-auto"
            onClick={() => setIsOpen(false)}
          />

          <div className="pointer-events-auto w-full sm:w-[410px] h-[85vh] sm:h-[580px] bg-warm-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-2 border-charcoal/30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
            {/* Header */}
            <div className="px-4 py-3.5 bg-charcoal text-warm-white flex items-center justify-between border-b-2 border-sage shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl bg-charcoal-700 border border-sage/50 flex items-center justify-center text-amber shadow-xs">
                  <Bot className="w-5 h-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-charcoal"></span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-heading font-black text-sm text-warm-white">
                      Campus AI Assistant
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber text-charcoal font-black uppercase">
                      Groq
                    </span>
                  </div>
                  <p className="text-[11px] text-sage-100 font-body">
                    Bidding strategies &bull; Notifications &bull; Rules
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="p-1.5 text-sage-100 hover:text-amber hover:bg-charcoal-700 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                  className="p-1.5 text-sage-100 hover:text-warm-white hover:bg-charcoal-700 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-warm-white-muted/40">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 shadow-2xs font-bold ${
                        isUser
                          ? 'bg-amber text-charcoal border border-amber-hover'
                          : 'bg-charcoal text-amber border border-charcoal-700'
                      }`}
                    >
                      {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs text-xs sm:text-sm font-body ${
                        isUser
                          ? 'bg-charcoal text-warm-white rounded-tr-xs'
                          : 'bg-white text-charcoal border border-sage/60 rounded-tl-xs'
                      }`}
                    >
                      {formatMarkdown(msg.content)}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {loading && (
                <div className="flex items-center gap-2 text-charcoal text-xs font-semibold bg-white border border-sage/60 rounded-xl px-3 py-2 w-fit shadow-2xs">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-charcoal animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber animate-bounce"></span>
                  </div>
                  <span className="text-[11px] text-charcoal/70">Campus AI is thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Starter Suggestion Chips */}
            <div className="px-3 py-2 bg-warm-white border-t border-sage/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {STARTER_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt.text)}
                  disabled={loading}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-sage-100 border border-sage/60 text-charcoal text-[11px] font-semibold whitespace-nowrap shadow-2xs hover:border-charcoal transition-all cursor-pointer disabled:opacity-50"
                >
                  {prompt.icon}
                  <span>{prompt.text}</span>
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-warm-white border-t border-sage/40 shrink-0">
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
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about bidding, alerts, handovers..."
                  disabled={loading}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-sage/70 bg-white text-charcoal text-xs sm:text-sm placeholder:text-charcoal/50 focus:outline-none focus:border-charcoal focus:ring-2 focus:ring-charcoal/20 transition-all font-body font-medium"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || loading}
                  className="w-10 h-10 rounded-xl bg-charcoal hover:bg-charcoal-hover disabled:opacity-40 text-amber font-black flex items-center justify-center transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 border border-charcoal"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="mt-1 flex items-center justify-between text-[10px] text-charcoal/60 px-1 font-body">
                <span>⚡ Powered by Groq</span>
                <span>Press Enter to send</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
