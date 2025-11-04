'use client';

import { useState } from 'react';
import { useAuth } from '../lib/auth-context';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Message {
    id: string;
    type: 'user' | 'bot';
    content: string;
    timestamp: Date;
}

export default function RagbotComponent() {
    const { user } = useAuth();
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: question,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setQuestion('');
        setLoading(true);

        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                const errorMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    type: 'bot',
                    content: 'Authentication required. Please log in.',
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMessage]);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/rag/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ question: userMessage.content }),
            });

            const data = await response.json();

            if (response.ok) {
                const botMessage: Message = {
                    id: (Date.now() + 2).toString(),
                    type: 'bot',
                    content: data.answer,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, botMessage]);
            } else {
                const errorMessage: Message = {
                    id: (Date.now() + 2).toString(),
                    type: 'bot',
                    content: data.error || 'Failed to get response.',
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error('Query error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 2).toString(),
                type: 'bot',
                content: 'Failed to get response. Please try again.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Chat with RAG Bot</h3>
            <div className="space-y-4">
                <div className="h-96 overflow-y-auto border border-gray-200 rounded-md p-4 space-y-3">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-500">
                            Ask questions about your uploaded documents!
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                        message.type === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-800'
                                    }`}
                                >
                                    <p className="text-sm">{message.content}</p>
                                    <p className="text-xs opacity-70 mt-1">
                                        {message.timestamp.toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                    <span className="text-sm">Thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <form onSubmit={handleSubmit} className="flex space-x-2">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask a question about your documents..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !question.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
