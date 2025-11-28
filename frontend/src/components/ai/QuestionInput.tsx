import { useState } from 'react';

interface QuestionInputProps {
    onSubmit: (question: string) => void;
    isLoading: boolean;
}

const SUGGESTED_QUESTIONS = [
    'What is the current market trend and sentiment?',
    'What are the key price levels to watch?',
    'Is this a good entry or exit point?',
    'How does recent news impact the price outlook?',
];

export function QuestionInput({ onSubmit, isLoading }: QuestionInputProps) {
    const [question, setQuestion] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (question.trim() && !isLoading) {
            onSubmit(question.trim());
            setQuestion('');
        }
    };

    return (
        <div className="space-y-3">
            {/* Suggested questions */}
            <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((suggested, idx) => (
                    <button
                        key={idx}
                        onClick={() => setQuestion(suggested)}
                        className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        disabled={isLoading}
                    >
                        {suggested}
                    </button>
                ))}
            </div>

            {/* Input form */}
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask about market trends..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                    maxLength={200}
                />
                <button
                    type="submit"
                    disabled={!question.trim() || isLoading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? '...' : 'Ask'}
                </button>
            </form>
        </div>
    );
}
