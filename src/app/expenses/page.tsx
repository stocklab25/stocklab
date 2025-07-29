'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import PageContainer from '@/components/PageContainer';
import { Card as UICard } from '@/components/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table';
import Button from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import ImportExpensesModal from '@/components/ImportExpensesModal';

export default function ExpensesPage() {
  const { getAuthToken } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [form, setForm] = useState({
    transactionDate: '',
    description: '',
    amount: '',
    category: '',
    card: '',
  });
  const [cards, setCards] = useState<any[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Row editing states
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    transactionDate: string;
    description: string;
    amount: string;
    category: string;
    cardId: string;
  }>({
    transactionDate: '',
    description: '',
    amount: '',
    category: '',
    cardId: '',
  });
  const [isRowSaving, setIsRowSaving] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    fetchExpenses();
    fetchCards();
    // eslint-disable-next-line
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

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      const res = await fetch('/api/expenses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setExpenses(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch expenses');
      }
    } catch (e) {
      setError('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchCards = async () => {
    setCardsLoading(true);
    setCardsError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      const res = await fetch('/api/cards', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setCards(data.data || []);
      } else {
        setCardsError(data.error || 'Failed to fetch cards');
      }
    } catch (e) {
      setCardsError('Failed to fetch cards');
    } finally {
      setCardsLoading(false);
    }
  };

  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => {
    setShowModal(false);
    setForm({ transactionDate: '', description: '', amount: '', category: '', card: '' });
    setSubmitError(null);
  };

  const handleImportSuccess = () => {
    fetchExpenses();
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionDate: form.transactionDate,
          description: form.description,
          amount: form.amount,
          category: form.category,
          cardId: form.card,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        handleCloseModal();
        fetchExpenses();
      } else {
        setSubmitError(data.error || 'Failed to add expense');
      }
    } catch (e) {
      setSubmitError('Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  // Row editing functions
  const handleEditClick = (expense: any) => {
    setEditingRowId(expense.id);
    setEditValues({
      transactionDate: expense.transactionDate ? expense.transactionDate.split('T')[0] : '',
      description: expense.description || '',
      amount: expense.amount?.toString() || '',
      category: expense.category || '',
      cardId: expense.cardId || '',
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditValues({ ...editValues, [e.target.name]: e.target.value });
  };

  const handleEditCancel = () => {
    setEditingRowId(null);
    setEditValues({
      transactionDate: '',
      description: '',
      amount: '',
      category: '',
      cardId: '',
    });
  };

  const handleEditSave = async (expense: any) => {
    setIsRowSaving(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionDate: editValues.transactionDate,
          description: editValues.description,
          amount: parseFloat(editValues.amount),
          category: editValues.category,
          cardId: editValues.cardId,
        }),
      });

      if (res.ok) {
        // Update local state
        setExpenses(prev => prev.map(item => 
          item.id === expense.id 
            ? {
                ...item,
                transactionDate: editValues.transactionDate,
                description: editValues.description,
                amount: parseFloat(editValues.amount),
                category: editValues.category,
                cardId: editValues.cardId,
              }
            : item
        ));
        setEditingRowId(null);
        setEditValues({
          transactionDate: '',
          description: '',
          amount: '',
          category: '',
          cardId: '',
        });
      } else {
        const data = await res.json();
        console.error('Failed to update expense:', data.error);
      }
    } catch (error) {
      console.error('Error updating expense:', error);
    } finally {
      setIsRowSaving(false);
    }
  };

  const handleDelete = async (expense: any) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setExpenses(prev => prev.filter(item => item.id !== expense.id));
      } else {
        const data = await res.json();
        console.error('Failed to delete expense:', data.error);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const toggleDropdown = (expenseId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (openDropdown === expenseId) {
      setOpenDropdown(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      x: rect.right - 192,
      y: rect.bottom + 5
    });
    setOpenDropdown(expenseId);
  };

  return (
    <Layout>
      <PageContainer>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
              <p className="text-muted-foreground mt-1">
                Track and manage business expenses
              </p>
            </div>
            <div className="flex space-x-2">
              <Button onClick={() => setShowImportModal(true)}>
                <span className="mr-2">📁</span>
                Import Expenses
              </Button>
              <Button onClick={handleOpenModal}>
                <span className="mr-2">+</span>
                Add Expense
              </Button>
            </div>
          </div>

          {/* Expenses Table */}
          <UICard>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading expenses...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">{error}</div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No expenses found.</div>
              ) : (
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Card</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {editingRowId === expense.id ? (
                            <input
                              type="date"
                              name="transactionDate"
                              value={editValues.transactionDate}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          ) : (
                            expense.transactionDate ? new Date(expense.transactionDate).toLocaleDateString() : ''
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === expense.id ? (
                            <input
                              type="text"
                              name="description"
                              value={editValues.description}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          ) : (
                            expense.description
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === expense.id ? (
                            <input
                              type="number"
                              name="amount"
                              value={editValues.amount}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border rounded text-sm"
                              step="0.01"
                            />
                          ) : (
                            Number(expense.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === expense.id ? (
                            <select
                              name="category"
                              value={editValues.category}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="">Select category</option>
                              <option value="Fees">Fees</option>
                              <option value="Business Meals">Business Meals</option>
                              <option value="Gifts">Gifts</option>
                              <option value="Inventory">Inventory</option>
                              <option value="Business Services">Business Services</option>
                              <option value="Travel">Travel</option>
                              <option value="Parking">Parking</option>
                              <option value="Marketing">Marketing</option>
                              <option value="Utilities">Utilities</option>
                              <option value="Supplies">Supplies</option>
                              <option value="Equipment">Equipment</option>
                              <option value="Payment">Payment</option>
                            </select>
                          ) : (
                            expense.category
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === expense.id ? (
                            <select
                              name="cardId"
                              value={editValues.cardId}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="">Select card</option>
                              {cards.map(card => (
                                <option key={card.id} value={card.id}>
                                  {card.name}{card.last4 ? ` ••••${card.last4}` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            expense.card ? `${expense.card.name}${expense.card.last4 ? ` ••••${expense.card.last4}` : ''}` : ''
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === expense.id ? (
                            <div className="flex gap-2">
                              <button
                                className="px-2 py-1 bg-primary text-white rounded flex items-center justify-center text-sm"
                                onClick={() => handleEditSave(expense)}
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
                              onClick={(e) => toggleDropdown(expense.id, e)}
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

        {/* Add Expense Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg p-6 w-1/2 shadow-lg">
              <h2 className="text-xl font-bold mb-4">Add Expense</h2>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    name="transactionDate"
                    value={form.transactionDate}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select category</option>
                    <option value="Fees">Fees</option>
                    <option value="Business Meals">Business Meals</option>
                    <option value="Gifts">Gifts</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Business Services">Business Services</option>
                    <option value="Travel">Travel</option>
                    <option value="Parking">Parking</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Supplies">Supplies</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Payment">Payment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Card</label>
                  <select
                    name="card"
                    value={form.card}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select card</option>
                    {cardsLoading ? (
                      <option disabled>Loading cards...</option>
                    ) : cardsError ? (
                      <option disabled>{cardsError}</option>
                    ) : (
                      cards.map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}{opt.last4 ? ` ••••${opt.last4}` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                {submitError && <div className="text-red-500 text-sm">{submitError}</div>}
                <div className="flex space-x-2 pt-2">
                  <Button type="button" variant="outline" onClick={handleCloseModal} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add Expense'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Import Expenses Modal */}
        <ImportExpensesModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />

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
                    const expense = expenses.find((item) => item.id === openDropdown);
                    if (expense) handleEditClick(expense);
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
                    const expense = expenses.find((item) => item.id === openDropdown);
                    if (expense) handleDelete(expense);
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
