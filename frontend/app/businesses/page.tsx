'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface Business {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

interface BusinessFormData {
    name: string;
    description: string;
}

export default function BusinessesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loadingBusinesses, setLoadingBusinesses] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState<BusinessFormData>({ name: '', description: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            fetchBusinesses();
        }
    }, [user]);

    const fetchBusinesses = async () => {
        try {
            setLoadingBusinesses(true);
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/businesses`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setBusinesses(data.businesses);
            } else {
                setError('Failed to fetch businesses');
            }
        } catch (error) {
            console.error('Error fetching businesses:', error);
            setError('Network error while fetching businesses');
        } finally {
            setLoadingBusinesses(false);
        }
    };

    const handleCreateBusiness = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        try {
            setSubmitting(true);
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/businesses`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    description: formData.description.trim() || null,
                }),
            });

            if (response.ok) {
                setShowCreateModal(false);
                setFormData({ name: '', description: '' });
                fetchBusinesses(); // Refresh the list
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to create business');
            }
        } catch (error) {
            console.error('Error creating business:', error);
            setError('Network error while creating business');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteBusiness = async (businessId: string) => {
        if (!confirm('Are you sure you want to delete this business? This action cannot be undone.')) {
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/businesses/${businessId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                fetchBusinesses(); // Refresh the list
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to delete business');
            }
        } catch (error) {
            console.error('Error deleting business:', error);
            setError('Network error while deleting business');
        }
    };

    const closeModals = () => {
        setShowCreateModal(false);
        setFormData({ name: '', description: '' });
        setError(null);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect to login
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                                ← Back to Dashboard
                            </button>
                            <h1 className="text-xl font-semibold text-gray-900">My Businesses</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-700">Welcome, {user.name || user.email}</span>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-medium text-gray-900">Businesses</h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    Manage your business information
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Add Business
                            </button>
                        </div>

                        {error && (
                            <div className="px-4 py-3 bg-red-50 border-l-4 border-red-400">
                                <div className="flex">
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {loadingBusinesses ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Loading businesses...</p>
                            </div>
                        ) : businesses.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-gray-400 text-6xl mb-4">🏢</div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No businesses yet</h3>
                                <p className="text-gray-600 mb-6">Get started by creating your first business.</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Create Your First Business
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Name
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Description
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Created
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Updated
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {businesses.map((business) => (
                                            <tr key={business.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={() => router.push(`/businesses/${business.id}`)}
                                                        className="text-sm font-medium text-indigo-600 hover:text-indigo-900 hover:underline"
                                                    >
                                                        {business.name}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900 max-w-xs truncate">
                                                        {business.description || 'No description'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(business.created_at)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(business.updated_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Create Business Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Business</h3>
                            <form onSubmit={handleCreateBusiness}>
                                <div className="mb-4">
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Business Name *
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                        maxLength={100}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        rows={3}
                                        maxLength={500}
                                    />
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={closeModals}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || !formData.name.trim()}
                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? 'Creating...' : 'Create Business'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}