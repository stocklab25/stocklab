'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import PageContainer from '@/components/PageContainer';
import { Card as UICard } from '@/components/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table';
import Button from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import ImportExpensesModal from '@/components/ImportExpensesModal';

const CATEGORY_OPTIONS = [
  { value: 'Parking', label: 'Parking' },
  { value: 'Travel', label: 'Travel' },
  { value: 'Inventory', label: 'Inventory' },
  { value: 'Supplies', label: 'Supplies' },
  { value: 'BusinessServices', label: 'Business Services' },
  { value: 'Payment', label: 'Payment' },
];

export default function ExpensesPage() {
  const { getAuthToken } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [form, setForm] = useState({
    transactionDate: '',
    description: '',
    amount: '',
    type: '',
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

  useEffect(() => {
    fetchExpenses();
    fetchCards();
    // eslint-disable-next-line
  }, []);

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
    setForm({ transactionDate: '', description: '', amount: '', type: '', category: '', card: '' });
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
          type: form.type,
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
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Card</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{expense.transactionDate ? new Date(expense.transactionDate).toLocaleDateString() : ''}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>{Number(expense.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</TableCell>
                        <TableCell>{expense.type}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{expense.card ? `${expense.card.name}${expense.card.last4 ? ` ••••${expense.card.last4}` : ''}` : ''}</TableCell>
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
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <input
                    type="text"
                    name="type"
                    value={form.type}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
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
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
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
      </PageContainer>
    </Layout>
  );
} 
