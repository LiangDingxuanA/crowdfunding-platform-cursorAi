'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { BuildingOfficeIcon, CurrencyDollarIcon, ChartBarIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Project {
  _id: string;
  name: string;
  type: string;
  location: string;
  targetAmount: number;
  currentAmount: number;
  returnRate: number;
  duration: string;
  description: string;
  status: string;
  createdBy: string;
  image?: string;
}

interface WalletSummary {
  balance: number;
  totalInvested: number;
  totalReturns: number;
  activeProjects: number;
}

const ProjectsPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState<{ [key: string]: string }>({});
  const [processingInvestment, setProcessingInvestment] = useState<{ [key: string]: boolean }>({});
  const [walletBalance, setWalletBalance] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    type: 'Residential',
    location: '',
    targetAmount: '',
    returnRate: '',
    duration: '',
    description: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [showDividendModal, setShowDividendModal] = useState<string | null>(null);
  const [dividendInput, setDividendInput] = useState('');
  const [dividendStatus, setDividendStatus] = useState<string | null>(null);
  const [dividendLoading, setDividendLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, walletRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/wallet/summary')
        ]);

        if (!projectsRes.ok || !walletRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [projectsData, walletData] = await Promise.all([
          projectsRes.json(),
          walletRes.json()
        ]);

        setProjects(projectsData);
        setWalletBalance(walletData.balance);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const handleInvestmentAmountChange = (projectId: string, value: string) => {
    setInvestmentAmount(prev => ({
      ...prev,
      [projectId]: value
    }));
  };

  const handleInvest = async (projectId: string) => {
    const amount = Number(investmentAmount[projectId]);
    if (!amount || isNaN(amount) || amount <= 0) {
      setError('Please enter a valid investment amount');
      return;
    }

    setProcessingInvestment(prev => ({
      ...prev,
      [projectId]: true
    }));
    setError(null);

    try {
      const res = await fetch('/api/projects/invest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          amount,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Investment failed');
      }

      const data = await res.json();

      // Update project in the list
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project._id === projectId
            ? {
                ...project,
                currentAmount: data.project.currentAmount,
                status: data.project.status,
              }
            : project
        )
      );

      // Update wallet balance
      setWalletBalance(data.newBalance);

      // Clear investment amount
      setInvestmentAmount(prev => ({
        ...prev,
        [projectId]: '',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Investment failed');
    } finally {
      setProcessingInvestment(prev => ({
        ...prev,
        [projectId]: false
      }));
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newProject,
          targetAmount: Number(newProject.targetAmount),
          returnRate: Number(newProject.returnRate),
          duration: Number(newProject.duration),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const createdProject = await res.json();
      setProjects(prev => [createdProject, ...prev]);
      setShowCreateForm(false);
      setNewProject({
        name: '',
        type: 'Residential',
        location: '',
        targetAmount: '',
        returnRate: '',
        duration: '',
        description: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  // Demo: Simulate investors for automation
  const getDemoInvestors = (project: Project) => {
    // In real app, fetch from backend
    return [
      { userId: 'user1', name: 'Alice' },
      { userId: 'user2', name: 'Bob' },
      { userId: 'user3', name: 'Charlie' },
    ];
  };

  const handlePayDividends = async (projectId: string) => {
    setDividendLoading(true);
    setDividendStatus(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/dividend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: dividendInput,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to pay dividends');
      setDividendStatus('Dividends paid successfully!');
      setDividendInput('');
    } catch (err: any) {
      setDividendStatus(err.message || 'Failed to pay dividends');
    } finally {
      setDividendLoading(false);
    }
  };

  const handlePayAll = (project: Project) => {
    // Demo: distribute 5% of currentAmount equally to demo investors
    const investors = getDemoInvestors(project);
    const totalDividend = project.currentAmount * 0.05;
    const perInvestor = totalDividend / investors.length;
    const dividends: Record<string, number> = {};
    investors.forEach(inv => { dividends[inv.userId] = Number(perInvestor.toFixed(2)); });
    setDividendInput(JSON.stringify({ dividends }, null, 2));
    setShowDividendModal(project._id);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-black">Loading projects...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-black">Investment Opportunities</h1>
          <div className="flex items-center space-x-4">
            <div className="text-black">
              Available Balance: <span className="font-semibold">${walletBalance.toLocaleString()}</span>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Project
          </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

        {showCreateForm && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-black mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Project Name</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 border rounded-lg text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Project Type</label>
                  <select
                    value={newProject.type}
                    onChange={(e) => setNewProject(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full p-2 border rounded-lg text-black"
                    required
                  >
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Location</label>
                  <input
                    type="text"
                    value={newProject.location}
                    onChange={(e) => setNewProject(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full p-2 border rounded-lg text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Target Amount ($)</label>
                  <input
                    type="number"
                    value={newProject.targetAmount}
                    onChange={(e) => setNewProject(prev => ({ ...prev, targetAmount: e.target.value }))}
                    className="w-full p-2 border rounded-lg text-black"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Return Rate (%)</label>
                  <input
                    type="number"
                    value={newProject.returnRate}
                    onChange={(e) => setNewProject(prev => ({ ...prev, returnRate: e.target.value }))}
                    className="w-full p-2 border rounded-lg text-black"
                    min="0"
                    step="0.1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Duration (months)</label>
                  <input
                    type="number"
                    value={newProject.duration}
                    onChange={(e) => setNewProject(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full p-2 border rounded-lg text-black"
                    min="1"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border rounded-lg text-black"
                  rows={4}
                  required
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {projects.map((project) => (
            <div
              key={project._id}
              className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => router.push(`/projects/${project._id}`)}
            >
              {/* Project Image Placeholder */}
              <div className="mb-4 w-full h-40 bg-gray-100 flex items-center justify-center rounded">
                {project.image ? (
                  <img
                    src={project.image}
                    alt={project.name}
                    className="object-cover w-full h-full rounded"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'; }}
                  />
                ) : (
                  <img
                    src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
                    alt="Project placeholder"
                    className="object-cover w-full h-full rounded"
                  />
                )}
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-black">{project.name}</h2>
                  <p className="text-black">{project.location}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  project.status === 'active' ? 'bg-green-100 text-green-800' :
                  project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-500 mr-2" />
                  <div>
                    <p className="text-sm text-black">Target Amount</p>
                    <p className="font-semibold text-black">${project.targetAmount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <ChartBarIcon className="h-6 w-6 text-blue-500 mr-2" />
                  <div>
                    <p className="text-sm text-black">Return Rate</p>
                    <p className="font-semibold text-black">{project.returnRate}%</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <BuildingOfficeIcon className="h-6 w-6 text-purple-500 mr-2" />
                  <div>
                    <p className="text-sm text-black">Duration</p>
                    <p className="font-semibold text-black">{project.duration} months</p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${(project.currentAmount / project.targetAmount) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm text-black">
                  <span>Progress: {((project.currentAmount / project.targetAmount) * 100).toFixed(1)}%</span>
                  <span>${project.currentAmount.toLocaleString()} raised</span>
                </div>
              </div>

              {project.status === 'active' && (
                <div className="mt-4 flex items-center space-x-4">
                  <input
                    type="number"
                    value={investmentAmount[project._id] || ''}
                    onChange={(e) => handleInvestmentAmountChange(project._id, e.target.value)}
                    placeholder="Enter investment amount"
                    className="flex-1 p-2 border rounded-lg text-black"
                    min="0"
                    step="0.01"
                    disabled={processingInvestment[project._id]}
                  />
                  <button
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    onClick={() => handleInvest(project._id)}
                    disabled={processingInvestment[project._id] || !investmentAmount[project._id]}
                  >
                    {processingInvestment[project._id] ? 'Processing...' : 'Invest Now'}
                </button>
              </div>
              )}

              {session?.user?.id === project.createdBy && (
                <div className="mt-4 flex space-x-2">
                  <button
                    className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600"
                    onClick={() => setShowDividendModal(project._id)}
                  >
                    Pay Dividends
                  </button>
                  <button
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                    onClick={() => handlePayAll(project)}
                  >
                    Pay All (Auto)
                  </button>
                </div>
              )}

              {/* Dividend Modal */}
              {showDividendModal === project._id && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                  <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                    <h3 className="text-lg font-bold mb-2">Pay Dividends for {project.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">Enter JSON: {'{"dividends": {"userId1": amount1, ...}}'}</p>
                    <textarea
                      className="w-full p-2 border rounded mb-2 text-black"
                      rows={5}
                      value={dividendInput}
                      onChange={e => setDividendInput(e.target.value)}
                      placeholder='{"dividends": {"user1": 100, "user2": 50}}'
                    />
                    {dividendStatus && (
                      <div className="mb-2 text-center text-sm text-green-600">{dividendStatus}</div>
                    )}
                    <div className="flex justify-end space-x-2">
                      <button
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        onClick={() => { setShowDividendModal(null); setDividendStatus(null); }}
                        disabled={dividendLoading}
                      >
                        Cancel
                      </button>
                      <button
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
                        onClick={() => handlePayDividends(project._id)}
                        disabled={dividendLoading}
                      >
                        {dividendLoading ? 'Paying...' : 'Submit'}
                      </button>
                    </div>
                  </div>
              </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProjectsPage; 