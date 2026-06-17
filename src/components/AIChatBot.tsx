import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, Sparkles, RefreshCw, ChevronDown } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  time: string;
}

interface AIChatBotProps {
  user: {
    name: string;
    role: string;
  };
}

export default function AIChatBot({ user }: AIChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested questions for quick actions in Bengali
  const quickQuestions = [
    { text: 'আজকের কালেকশন কত?', label: '💰 আজকের কালেকশন' },
    { text: 'আমাদের মোট মেম্বার কতজন?', label: '👥 মেম্বার সংখ্যা' },
    { text: 'লোন পেন্ডিং কতটি?', label: '⌛ লোন মঞ্জুর পেন্ডিং' },
    { text: 'আমাদের কোন কোন মেইন ব্রাঞ্চ আছে?', label: '🏢 ব্রাঞ্চ তালিকা' },
  ];

  // Initialize with welcome message when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greetingName = user.name;
      
      setMessages([
        {
          role: 'assistant',
          text: `আসসালামু আলাইকুম ${greetingName}! আলজুয়া এমএফআই এআই সহকারী (Aljooya MFI AI Assistant) সার্ভিসে আপনাকে স্বাগতম। 🌟\n\nআমি আমাদের ডাটাবেজ থেকে রিয়েল-টাইম ডাটা সরাসরি দেখতে পারি। আপনি আমাকে আমাদের মেম্বার, লোন স্কিম, ব্রাঞ্চ হিসাব, খরচ বা আজকের কালেকশন সংক্রান্ত যেকোনো প্রশ্ন করতে পারেন। আমি আপনাকে বাংলায় সুন্দর করে বুঝিয়ে দেব। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি বলুন?`,
          time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    }
  }, [isOpen, messages.length, user.name]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      // Prepare message history for backend
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        text: m.text
      }));

      const resData = await fetchWithAuth('/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      const aiReplyText = resData.response || "আমি দুঃখিত, আপনার উত্তরটি তৈরি করতে পারিনি। অনুগ্রহ করে আবার চেষ্টা করুন।";

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: aiReplyText,
          time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } catch (err: any) {
      console.error("AI chat error:", err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: "⚠️ এআই সার্ভারের সাথে সংযোগ করতে সমস্যা হয়েছে। অনুগ্রহ করে নিশ্চিত করুন যে আপনার সেটিংস প্যানেলে `GEMINI_API_KEY` সঠিকভাবে যুক্ত করা আছে এবং আবার চেষ্টা করুন।",
          time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Safe renderer for rich formatting in Bengali responses
  const formatResponseText = (text: string) => {
    if (!text) return '';
    return text.split('\n').map((line, i) => {
      let content = line;
      let isBullet = false;
      
      // Handle simple bullet markers
      if (line.trim().startsWith('- ')) {
        content = line.trim().substring(2);
        isBullet = true;
      } else if (line.trim().startsWith('* ')) {
        content = line.trim().substring(2);
        isBullet = true;
      } else if (line.trim().startsWith('• ')) {
        content = line.trim().substring(2);
        isBullet = true;
      }
      
      // Bold text formatting with **
      const parts = content.split('**');
      const formattedLine = parts.map((part, index) => {
        if (index % 2 === 1) {
          return <strong key={index} className="font-extrabold text-slate-900 drop-shadow-[0_0_0.5px_rgba(30,41,59,0.1)]">{part}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={i} className="ml-5 list-disc pl-1 py-1 text-slate-700 text-[13px] leading-relaxed">
            {formattedLine}
          </li>
        );
      }
      return (
        <p key={i} className={line.trim() === '' ? 'h-3' : 'py-1 text-slate-700 text-[13px] leading-relaxed'}>
          {formattedLine}
        </p>
      );
    });
  };

  // Only allowed for Superadmin, Managers, Branch Managers
  const allowedRoles = ['superadmin', 'branch_manager', 'am', 'dm', 'manager'];
  if (!allowedRoles.includes(user.role)) {
    return null;
  }

  return (
    <div className="relative print:hidden">
      {/* Floating Toggle Button */}
      <motion.button
        id="ai-assistant-toggle-btn"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 text-white p-4 rounded-full shadow-[0_10px_30px_rgb(79,70,229,0.3)] hover:shadow-[0_15px_35px_rgb(79,70,229,0.4)] transition-all cursor-pointer border border-indigo-400"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className="flex items-center gap-2"
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <Bot className="w-6 h-6 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <span className="text-xs font-black tracking-widest uppercase pr-1 hidden sm:inline-block">ALJOOYA AI</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-assistant-chat-panel"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[420px] h-[600px] max-h-[calc(100vh-8rem)] z-50 bg-slate-50 shadow-[0_20px_50px_rgba(15,23,42,0.15)] rounded-2xl border border-slate-200/80 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 text-white px-5 py-4 flex items-center justify-between border-b border-indigo-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/10 relative">
                  <Bot className="w-5 h-5 text-white" />
                  <Sparkles className="w-3 h-3 text-amber-300 absolute -bottom-1 -right-1" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-wide">আলজুয়া এআই সহকারী</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                    <p className="text-[10px] text-indigo-100 font-bold tracking-wider uppercase">MFI Smart Agent</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  title="চ্যাট হিস্ট্রি মুছুন"
                  className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-100 hover:text-white transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-100 hover:text-white transition-all"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1 mb-1 px-1">
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                        {msg.role === 'user' ? 'আপনি' : 'এআই সহকারী'}
                      </span>
                      <span className="text-[9px] text-slate-300">•</span>
                      <span className="text-[9px] text-slate-400">{msg.time}</span>
                    </div>
                    
                    <div
                      className={`px-4 py-3 rounded-2xl max-w-[85%] text-slate-800 shadow-sm border ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-indigo-400 rounded-tr-none'
                          : 'bg-white border-slate-200/70 rounded-tl-none'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="text-[13px] leading-relaxed break-words font-medium">{msg.text}</p>
                      ) : (
                        <div className="break-words font-medium whitespace-pre-wrap">
                          {formatResponseText(msg.text)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Bot thinking placeholder */}
              {loading && (
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[9px] font-bold text-slate-400 tracking-wider">এআই সহকারী</span>
                    <span className="text-[9px] text-slate-300">•</span>
                    <span className="text-[9px] text-slate-400 animate-pulse">অনুসন্ধান করা হচ্ছে...</span>
                  </div>
                  <div className="bg-white border border-slate-200/70 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-violet-700 rounded-full animate-bounce"></span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Helper Questions panel */}
            {messages.length <= 2 && !loading && (
              <div className="bg-slate-100/80 px-4 py-2 border-t border-b border-slate-200/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">সহজে প্রশ্ন করুন (Quick Inquiry)</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickQuestions.map((qq, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(qq.text)}
                      className="text-[11px] font-black tracking-wide bg-white hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 hover:border-indigo-200 px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-sm transition-all text-left cursor-pointer"
                    >
                      {qq.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Footer Area */}
            <div className="p-4 bg-white border-t border-slate-200/80 flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage(inputValue);
                }}
                disabled={loading}
                placeholder="এআই সহকারীকে বাংলায় প্রশ্ন করুন..."
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50"
              />
              <button
                onClick={() => handleSendMessage(inputValue)}
                disabled={loading || !inputValue.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
