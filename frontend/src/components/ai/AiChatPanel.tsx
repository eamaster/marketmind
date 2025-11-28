import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../services/types';
import { QuestionInput } from './QuestionInput';

interface AiChatPanelProps {
    messages: ChatMessage[];
    onSendQuestion: (question: string) => void;
    isLoading: boolean;
    currentContext: {
        assetType: string;
        symbol: string;
        timeframe: string;
    };
}

export function AiChatPanel({ messages, onSendQuestion, isLoading, currentContext }: AiChatPanelProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className="card flex flex-col h-full max-h-[600px]">
            {/* Header */}
            <div className="border-b border-gray-200 pb-3 mb-3">
                <h2 className="text-lg font-semibold text-gray-900">AI Market Analyst</h2>
                <p className="text-xs text-gray-500 mt-1">
                    Context: {currentContext.symbol} · {currentContext.timeframe}
                </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <p className="text-sm">Ask me anything about the current market data!</p>
                        <p className="text-xs mt-2">I'll analyze charts and news to provide insights.</p>
                    </div>
                ) : (
                    messages.map((message, idx) => (
                        <div
                            key={idx}
                            className={`p-3 rounded-lg ${message.role === 'user'
                                    ? 'bg-blue-50 ml-8'
                                    : 'bg-gray-50 mr-8'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-gray-700">
                                    {message.role === 'user' ? '👤 You' : '🤖 AI Analyst'}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{message.content}</p>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <QuestionInput onSubmit={onSendQuestion} isLoading={isLoading} />
        </div>
    );
}
