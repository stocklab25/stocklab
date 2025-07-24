'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import PageContainer from '@/components/PageContainer';
import { Card as UICard } from '@/components/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table';
import Button from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';

interface AccountingEntry {
  id: string;
  transactionDate: string;
  name: string;
  description: string;
  accountType: 'RECEIVABLE' | 'PAYABLE';
  amount: string;
  createdAt: string;
  updatedAt: string;
}

export default function AccountingPage() {
  const { getAuthToken } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [accounting, setAccounting] = useState<AccountingEntry[]>([]);
  const [form, setForm] = useState({
    transactionDate: '',
    name: '',
    description: '',
    accountType: '',
    amount: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAccounting();
  }, []);

  const fetchAccounting = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      const res = await fetch('/api/accounting', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAccounting(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch accounting entries');
      }
    } catch (e) {
      setError('Failed to fetch accounting entries');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => {
    setShowModal(false);
    setForm({ transactionDate: '', name: '', description: '', accountType: '', amount: '' });
    setSubmitError(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      const res = await fetch('/api/accounting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionDate: form.transactionDate,
          name: form.name,
          description: form.description,
          accountType: form.accountType,
          amount: form.amount,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        handleCloseModal();
        fetchAccounting();
      } else {
        setSubmitError(data.error || 'Failed to add accounting entry');
      }
    } catch (e) {
      setSubmitError('Failed to add accounting entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate totals
  const totalReceivables = accounting
    .filter(entry => entry.accountType === 'RECEIVABLE')
    .reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

  const totalPayables = accounting
    .filter(entry => entry.accountType === 'PAYABLE')
    .reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

  return (
    <Layout>
      <PageContainer>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Accounts</h1>
              <p className="text-muted-foreground mt-1">
                Track receivables and payables
              </p>
            </div>
            <Button onClick={handleOpenModal}>
              <span className="mr-2">+</span>
              Add Entry
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UICard>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-green-600 mb-2">Total Receivables</h3>
                <p className="text-2xl font-bold text-green-600">
                  {totalReceivables.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </p>
              </div>
            </UICard>
            <UICard>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-red-600 mb-2">Total Payables</h3>
                <p className="text-2xl font-bold text-red-600">
                  {totalPayables.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </p>
              </div>
            </UICard>
          </div>

          {/* Accounting Table */}
          <UICard>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading accounting entries...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">{error}</div>
              ) : accounting.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No accounting entries found.</div>
              ) : (
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounting.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {entry.transactionDate ? new Date(entry.transactionDate).toLocaleDateString() : ''}
                        </TableCell>
                        <TableCell className="font-medium">{entry.name}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.accountType === 'RECEIVABLE' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {entry.accountType}
                          </span>
                        </TableCell>
                        <TableCell className={`font-medium ${
                          entry.accountType === 'RECEIVABLE' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Number(entry.amount).toLocaleString('en-US', { 
                            style: 'currency', 
                            currency: 'USD' 
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </UICard>
        </div>

        {/* Add Entry Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg p-6 w-1/2 shadow-lg">
              <h2 className="text-xl font-bold mb-4">Add Accounting Entry</h2>
              <form onSubmit={handleAddEntry} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date *</label>
                  <input
                    type="date"
                    name="transactionDate"
                    value={form.transactionDate}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <input
                    type="text"
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Account Type *</label>
                  <select
                    name="accountType"
                    value={form.accountType}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select account type</option>
                    <option value="RECEIVABLE" className="text-green-600">Receivable</option>
                    <option value="PAYABLE" className="text-red-600">Payable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount (dollars) *</label>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
                {submitError && <div className="text-red-500 text-sm">{submitError}</div>}
                <div className="flex space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseModal} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add Entry'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PageContainer>
    </Layout>
  );
} 