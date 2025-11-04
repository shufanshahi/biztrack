'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

export default function BusinessDetailPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const businessId = params.id as string;

    const [business, setBusiness] = useState<Business | null>(null);
    const [loadingBusiness, setLoadingBusiness] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [formData, setFormData] = useState<BusinessFormData>({ name: '', description: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user && businessId) {
            fetchBusiness();
        }
    }, [user, businessId]);

    const fetchBusiness = async () => {
        try {
            setLoadingBusiness(true);
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/businesses/${businessId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setBusiness(data.business);
            } else {
                setError('Failed to fetch business');
            }
        } catch (error) {
            console.error('Error fetching business:', error);
            setError('Network error while fetching business');
        } finally {
            setLoadingBusiness(false);
        }
    };

    const handleEditBusiness = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        try {
            setSubmitting(true);
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/businesses/${businessId}`, {
                method: 'PUT',
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
                setShowEditModal(false);
                setFormData({ name: '', description: '' });
                fetchBusiness(); // Refresh the data
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to update business');
            }
        } catch (error) {
            console.error('Error updating business:', error);
            setError('Network error while updating business');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteBusiness = async () => {
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
                router.push('/businesses'); // Redirect to businesses list
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to delete business');
            }
        } catch (error) {
            console.error('Error deleting business:', error);
            setError('Network error while deleting business');
        }
    };

    const openEditModal = () => {
        if (business) {
            setFormData({ name: business.name, description: business.description || '' });
            setShowEditModal(true);
        }
    };

    const closeModals = () => {
        setShowEditModal(false);
        setFormData({ name: '', description: '' });
        setError(null);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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
                                onClick={() => router.push('/businesses')}
                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                                ← Back to Businesses
                            </button>
                            <h1 className="text-xl font-semibold text-gray-900">Business Details</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-700">Welcome, {user.name || user.email}</span>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    {error && (
                        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                            <div className="flex">
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {loadingBusiness ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading business...</p>
                        </div>
                    ) : business ? (
                        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-medium text-gray-900">{business.name}</h2>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Business details and management
                                    </p>
                                </div>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={openEditModal}
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Edit Business
                                    </button>
                                    <button
                                        onClick={handleDeleteBusiness}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    >
                                        Delete Business
                                    </button>
                                </div>
                            </div>
                            <div className="border-t border-gray-200">
                                <dl>
                                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                        <dt className="text-sm font-medium text-gray-500">Business Name</dt>
                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{business.name}</dd>
                                    </div>
                                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                        <dt className="text-sm font-medium text-gray-500">Description</dt>
                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                            {business.description || 'No description provided'}
                                        </dd>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                        <dt className="text-sm font-medium text-gray-500">Created</dt>
                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(business.created_at)}</dd>
                                    </div>
                                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                        <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(business.updated_at)}</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="text-gray-400 text-6xl mb-4">🏢</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Business not found</h3>
                            <p className="text-gray-600 mb-6">The business you're looking for doesn't exist or you don't have access to it.</p>
                            <button
                                onClick={() => router.push('/businesses')}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Back to Businesses
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Edit Business Modal */}
            {showEditModal && business && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Business</h3>
                            <form onSubmit={handleEditBusiness}>
                                <div className="mb-4">
                                    <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Business Name *
                                    </label>
                                    <input
                                        type="text"
                                        id="edit-name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                        maxLength={100}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        id="edit-description"
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
                                        {submitting ? 'Updating...' : 'Update Business'}
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