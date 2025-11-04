'use client';

import { useState } from 'react';
import { useAuth } from '../../lib/auth-context';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function UploadsComponent() {
    const { user } = useAuth();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setMessage('');
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setMessage('Please select a file first.');
            return;
        }

        setUploading(true);
        setMessage('');

        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                setMessage('Authentication required. Please log in.');
                return;
            }

            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await fetch(`${API_BASE_URL}/uploads/single`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('File uploaded and processed successfully!');
                setSelectedFile(null);
                // Reset file input
                const fileInput = document.getElementById('file-input') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            } else {
                setMessage(data.error || 'Upload failed.');
            }
        } catch (error) {
            console.error('Upload error:', error);
            setMessage('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Files</h3>
            <div className="space-y-4">
                <div>
                    <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
                        Select File
                    </label>
                    <input
                        id="file-input"
                        type="file"
                        onChange={handleFileSelect}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif"
                    />
                </div>
                {selectedFile && (
                    <div className="text-sm text-gray-600">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                )}
                <button
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                    {uploading ? 'Uploading...' : 'Upload File'}
                </button>
                {message && (
                    <div className={`text-sm ${message.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}
