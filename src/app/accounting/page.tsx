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

  // Row editing states
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    transactionDate: string;
    name: string;
    description: string;
    accountType: string;
    amount: string;
  }>({
    transactionDate: '',
    name: '',
    description: '',
    accountType: '',
    amount: '',
  });
  const [isRowSaving, setIsRowSaving] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    fetchAccounting();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target.closest('.dropdown-menu')) return;
      if (openDropdown) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

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

  // Row editing functions
  const handleEditClick = (entry: AccountingEntry) => {
    setEditingRowId(entry.id);
    setEditValues({
      transactionDate: entry.transactionDate ? entry.transactionDate.split('T')[0] : '',
      name: entry.name || '',
      description: entry.description || '',
      accountType: entry.accountType || '',
      amount: entry.amount?.toString() || '',
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditValues({ ...editValues, [e.target.name]: e.target.value });
  };

  const handleEditCancel = () => {
    setEditingRowId(null);
    setEditValues({
      transactionDate: '',
      name: '',
      description: '',
      accountType: '',
      amount: '',
    });
  };

  const handleEditSave = async (entry: AccountingEntry) => {
    setIsRowSaving(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const res = await fetch(`/api/accounting/${entry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionDate: editValues.transactionDate,
          name: editValues.name,
          description: editValues.description,
          accountType: editValues.accountType,
          amount: parseFloat(editValues.amount),
        }),
      });

      if (res.ok) {
        // Update local state
        setAccounting(prev => prev.map(item => 
          item.id === entry.id 
            ? {
                ...item,
                transactionDate: editValues.transactionDate,
                name: editValues.name,
                description: editValues.description,
                accountType: editValues.accountType as 'RECEIVABLE' | 'PAYABLE',
                amount: editValues.amount,
              }
            : item
        ));
        setEditingRowId(null);
        setEditValues({
          transactionDate: '',
          name: '',
          description: '',
          accountType: '',
          amount: '',
        });
      } else {
        const data = await res.json();
        console.error('Failed to update accounting entry:', data.error);
      }
    } catch (error) {
      console.error('Error updating accounting entry:', error);
    } finally {
      setIsRowSaving(false);
    }
  };

  const handleDelete = async (entry: AccountingEntry) => {
    if (!window.confirm('Are you sure you want to delete this accounting entry?')) return;
    
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const res = await fetch(`/api/accounting/${entry.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setAccounting(prev => prev.filter(item => item.id !== entry.id));
      } else {
        const data = await res.json();
        console.error('Failed to delete accounting entry:', data.error);
      }
    } catch (error) {
      console.error('Error deleting accounting entry:', error);
    }
  };

  const toggleDropdown = (entryId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (openDropdown === entryId) {
      setOpenDropdown(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      x: rect.right - 192,
      y: rect.bottom + 5
    });
    setOpenDropdown(entryId);
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounting.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {editingRowId === entry.id ? (
                            <input
                              type="date"
                              name="transactionDate"
                              value={editValues.transactionDate}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          ) : (
                            entry.transactionDate ? new Date(entry.transactionDate).toLocaleDateString() : ''
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === entry.id ? (
                            <input
                              type="text"
                              name="name"
                              value={editValues.name}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          ) : (
                            <span className="font-medium">{entry.name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === entry.id ? (
                            <input
                              type="text"
                              name="description"
                              value={editValues.description}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          ) : (
                            entry.description
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === entry.id ? (
                            <select
                              name="accountType"
                              value={editValues.accountType}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="">Select account type</option>
                              <option value="RECEIVABLE">Receivable</option>
                              <option value="PAYABLE">Payable</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              entry.accountType === 'RECEIVABLE' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {entry.accountType}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === entry.id ? (
                            <input
                              type="number"
                              name="amount"
                              value={editValues.amount}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border rounded text-sm"
                              step="0.01"
                              min="0"
                            />
                          ) : (
                            <span className={`font-medium ${
                              entry.accountType === 'RECEIVABLE' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {Number(entry.amount).toLocaleString('en-US', { 
                                style: 'currency', 
                                currency: 'USD' 
                              })}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === entry.id ? (
                            <div className="flex gap-2">
                              <button
                                className="px-2 py-1 bg-primary text-white rounded flex items-center justify-center text-sm"
                                onClick={() => handleEditSave(entry)}
                                disabled={isRowSaving}
                              >
                                {isRowSaving ? (
                                  <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                  </svg>
                                ) : null}
                                {isRowSaving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                className="px-2 py-1 bg-gray-300 text-gray-800 rounded text-sm"
                                onClick={handleEditCancel}
                                disabled={isRowSaving}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                              onClick={(e) => toggleDropdown(entry.id, e)}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="6" r="1.5" />
                                <circle cx="12" cy="12" r="1.5" />
                                <circle cx="12" cy="18" r="1.5" />
                              </svg>
                            </button>
                          )}
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

        {/* Dropdown Menu - Positioned outside table */}
        {openDropdown && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setOpenDropdown(null)}
            />
            <div 
              className="fixed z-50 bg-white rounded-md shadow-lg border border-gray-200 w-48 dropdown-menu"
              style={{
                left: `${dropdownPosition.x}px`,
                top: `${dropdownPosition.y}px`
              }}
            >
              <div className="py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const entry = accounting.find((item) => item.id === openDropdown);
                    if (entry) handleEditClick(entry);
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                  disabled={isRowSaving}
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const entry = accounting.find((item) => item.id === openDropdown);
                    if (entry) handleDelete(entry);
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  disabled={isRowSaving}
                >
                  Delete
                </button>
              </div>
            </div>
          </>
        )}
      </PageContainer>
    </Layout>
  );
} 