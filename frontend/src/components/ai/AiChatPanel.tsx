import { useEffect, useRef, useState } from 'react';
import { Paperclip, Mic, Send, X } from 'lucide-react';
import type { ChatMessage } from '../../services/types';

interface AiChatPanelProps {
    messages: ChatMessage[];
    onSendQuestion: (question: string) => void;
    onClearChat: () => void; // Clear chat history
    isLoading: boolean;
    currentContext: {
        assetType: string;
        symbol: string;
        timeframe: string;
    };
    onClose: () => void;
}

const SUGGESTED_QUESTIONS = [
    'What are the key support levels?',
    'Analyze recent price trends',
    'What do the news sentiment indicators say?',
    'Should I buy or sell now?',
];

export function AiChatPanel({
    messages,
    onSendQuestion,
    onClearChat,
    isLoading,
    currentContext,
    onClose,
}: AiChatPanelProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSuggestedQuestion = (question: string) => {
        if (!isLoading) {
            onSendQuestion(question);
        }
    };

    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const handleClearClick = () => {
        if (messages.length === 0) return;
        setShowClearConfirm(true);
    };

    const handleConfirmClear = () => {
        setShowClearConfirm(false);
        onClearChat();
    };

    const handleCancelClear = () => {
        setShowClearConfirm(false);
    };

    return (
        <div
            className="flex flex-col h-full bg-white dark:bg-slate-900/50 rounded-2xl overflow-hidden"
            role="complementary"
            aria-label="AI Market Analyst chat"
        >
            {/* GRADIENT HEADER */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold text-white flex items-center gap-2">
                            🤖 AI Analyst
                        </h2>
                        <p className="text-xs text-blue-100 mt-0.5">
                            Powered by Gemini
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Context Badge */}
                        <div className="hidden sm:flex px-2 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-medium text-white whitespace-nowrap">
                            📊 {currentContext.symbol} · {currentContext.timeframe}
                        </div>

                        {/* Clear Chat Button */}
                        {messages.length > 0 && (
                            <button
                                onClick={handleClearClick}
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                aria-label="Clear chat history"
                                title="Clear all messages"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                            aria-label="Close chat"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* MESSAGES AREA */}
            <div
                className="flex-1 overflow-y-auto p-4 space-y-4"
                role="log"
                aria-live="polite"
                aria-atomic="false"
            >
                {messages.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-4xl mb-3">💬</div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                            Ask me anything about the current market data!
                        </p>
                        <p className="text-xs text-slate-500">
                            I'll analyze charts and news to provide insights.
                        </p>

                        {/* Fair Use Notice */}
                        <div className="mt-4 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200">
                            <p className="font-semibold">⚡ Fair Use Policy</p>
                            <p className="mt-1">
                                Limited to <strong>10 questions per hour</strong> to keep this free service sustainable.
                            </p>
                        </div>

                        {/* SUGGESTED QUESTIONS */}
                        <div className="mt-6">
                            <p className="text-xs text-slate-500 mb-3">
                                Try asking:
                            </p>
                            <div
                                className="flex flex-wrap gap-2 justify-center"
                                role="list"
                            >
                                {SUGGESTED_QUESTIONS.map((question, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSuggestedQuestion(question)}
                                        className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                                        role="listitem"
                                        disabled={isLoading}
                                    >
                                        {question}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    messages.map((message, idx) => {
                        const isUser = message.role === 'user';
                        return (
                            <div
                                key={idx}
                                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl p-3 ${isUser
                                        ? 'bg-blue-600 text-white rounded-tr-sm'
                                        : 'bg-slate-100 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-sm shadow-sm'
                                        }`}
                                >
                                    {/* Message Header */}
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold">
                                            {isUser ? '👤 You' : '🤖 AI Analyst'}
                                        </span>
                                        <span className={`text-xs ${isUser ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {new Date(message.timestamp).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>

                                    {/* Message Content */}
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                        {message.content}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Typing Indicator */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-2xl rounded-tl-sm p-3 bg-slate-100 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-700 shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                    🤖 AI Analyst
                                </span>
                            </div>
                            <div className="flex gap-1 mt-2">
                                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Clear Confirmation Modal */}
            {showClearConfirm && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            Clear Chat History?
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                            This will permanently delete all messages. This cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancelClear}
                                className="flex-1 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmClear}
                                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INPUT AREA */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900/50">
                <QuestionInput onSubmit={onSendQuestion} isLoading={isLoading} />
            </div>
        </div>
    );
}

// Separate QuestionInput component
interface QuestionInputProps {
    onSubmit: (question: string) => void;
    isLoading: boolean;
}

function QuestionInput({ onSubmit, isLoading }: QuestionInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const question = inputRef.current?.value.trim();
        if (question && !isLoading) {
            onSubmit(question);
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            {/* Attach Chart Button */}
            <button
                type="button"
                className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                aria-label="Attach chart to message"
                disabled={isLoading}
            >
                <Paperclip size={18} />
            </button>

            {/* Input Field */}
            <input
                ref={inputRef}
                type="text"
                placeholder="Ask about market trends..."
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                disabled={isLoading}
                aria-label="Ask AI analyst a question"
                role="textbox"
            />

            {/* Microphone Button (disabled) */}
            <button
                type="button"
                className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                aria-label="Voice input (coming soon)"
                aria-disabled="true"
                disabled
            >
                <Mic size={18} />
            </button>

            {/* Send Button */}
            <button
                type="submit"
                className="p-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:shadow-lg hover:shadow-blue-600/30 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
                aria-label="Send message"
            >
                <Send size={18} />
            </button>
        </form>
    );
}
