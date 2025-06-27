"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useSession } from 'next-auth/react';

interface Project {
  _id: string;
  name: string;
  type: string;
  location: string;
  targetAmount: number;
  currentAmount: number;
  returnRate: number;
  duration: string;
  status: string;
  description: string;
  createdBy: string;
  image?: string;
}

const ProjectDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${params.projectId}`);
        if (!res.ok) throw new Error('Failed to fetch project');
        const data = await res.json();
        setProject(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch project');
      } finally {
        setLoading(false);
      }
    };
    if (params.projectId) fetchProject();
  }, [params.projectId]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-black">Loading project...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !project) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600">{error || 'Project not found'}</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto mt-8">
        <button
          className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => router.push('/projects')}
        >
          ← Back to Projects
        </button>
        <div className="bg-white rounded-lg shadow p-6">
          {project.image ? (
            <div className="mb-6 w-full h-64 bg-gray-100 flex items-center justify-center rounded">
              <img
                src={project.image}
                alt={project.name}
                className="object-cover w-full h-full rounded"
                onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'; }}
              />
            </div>
          ) : (
            <div className="mb-6 w-full h-64 bg-gray-100 flex items-center justify-center rounded">
              <img
                src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
                alt="Project placeholder"
                className="object-cover w-full h-full rounded"
              />
            </div>
          )}
          <h1 className="text-3xl font-bold mb-2 text-black">{project.name}</h1>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">{project.type}</span>
            <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">{project.location}</span>
            <span className={`px-3 py-1 rounded-full text-sm ${
              project.status === 'active' ? 'bg-green-100 text-green-800' :
              project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
          </div>
          <div className="mb-4">
            <div className="flex justify-between text-black">
              <span>Target Amount:</span>
              <span>${project.targetAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-black">
              <span>Current Amount:</span>
              <span>${project.currentAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-black">
              <span>Return Rate:</span>
              <span>{project.returnRate}%</span>
            </div>
            <div className="flex justify-between text-black">
              <span>Duration:</span>
              <span>{project.duration} months</span>
            </div>
          </div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-1 text-black">Description</h2>
            <p className="text-gray-700 whitespace-pre-line">{project.description}</p>
          </div>
          {/* Optionally, add investment form and payout buttons here if user is owner */}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProjectDetailPage; 