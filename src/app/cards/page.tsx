'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import PageContainer from '@/components/PageContainer';
import { Card as UICard } from '@/components/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table';
import Button from '@/components/Button';
import PromptModal from '@/components/PromptModal';
import { useAuth } from '@/contexts/AuthContext';

export default function CardsPage() {
  const { getAuthToken } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', last4: '', bank: '', type: '' });
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchCards();
    // eslint-disable-next-line
  }, []);

  const fetchCards = async () => {
    setLoading(true);
    setError(null);
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
        setError(data.error || 'Failed to fetch cards');
      }
    } catch (e) {
      setError('Failed to fetch cards');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => {
    setShowModal(false);
    setForm({ name: '', last4: '', bank: '', type: '' });
    setError(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setCards([data.data, ...cards]);
        handleCloseModal();
      } else {
        setError(data.error || 'Failed to add card');
      }
    } catch (e) {
      setError('Failed to add card');
    }
  };

  const handleDeleteCard = async () => {
    if (!cardToDelete) return;
    
    setIsDeleting(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const res = await fetch(`/api/cards/${cardToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const data = await res.json();
      if (res.ok) {
        setCards(cards.filter(card => card.id !== cardToDelete.id));
        setShowDeleteModal(false);
        setCardToDelete(null);
      } else {
        setError(data.error || 'Failed to delete card');
      }
    } catch (e) {
      setError('Failed to delete card');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleDropdown = (cardId: string, event: React.MouseEvent) => {
    if (openDropdown === cardId) {
      setOpenDropdown(null);
      setCardToDelete(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setDropdownPosition({
        x: rect.right - 192, // 192px is the width of the dropdown (w-48)
        y: rect.bottom + 8
      });
      setOpenDropdown(cardId);
      const card = cards.find((c) => c.id === cardId);
      setCardToDelete(card || null);
    }
  };

  return (
    <Layout>
      <PageContainer>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Cards</h1>
              <p className="text-muted-foreground mt-1">Manage your payment cards</p>
            </div>
            <Button onClick={handleOpenModal}>
              <span className="mr-2">+</span>
              Add Card
            </Button>
          </div>

          <UICard>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading cards...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">{error}</div>
              ) : cards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No cards found.</div>
              ) : (
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Last 4</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cards.map((card) => (
                      <TableRow key={card.id}>
                        <TableCell>{card.name}</TableCell>
                        <TableCell>{card.last4 || '-'}</TableCell>
                        <TableCell>{card.bank || '-'}</TableCell>
                        <TableCell>{card.type || '-'}</TableCell>
                        <TableCell>{new Date(card.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="relative">
                            <button
                              onClick={(e) => toggleDropdown(card.id, e)}
                              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                              disabled={isDeleting}
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </UICard>
        </div>

        {/* Add Card Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg p-6 w-1/2 shadow-lg">
              <h2 className="text-xl font-bold mb-4">Add Card</h2>
              <form onSubmit={handleAddCard} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last 4 Digits</label>
                  <input
                    type="text"
                    name="last4"
                    value={form.last4}
                    onChange={handleFormChange}
                    maxLength={4}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bank</label>
                  <input
                    type="text"
                    name="bank"
                    value={form.bank}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <input
                    type="text"
                    name="type"
                    value={form.type}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <div className="flex space-x-2 pt-2">
                  <Button type="button" variant="outline" onClick={handleCloseModal}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Card
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <PromptModal
          show={showDeleteModal}
          title="Delete Card"
          onClose={() => { setShowDeleteModal(false); setCardToDelete(null); }}
        >
          <div className="space-y-4">
            <p>
              Are you sure you want to delete "{cardToDelete?.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                onClick={() => { setShowDeleteModal(false); setCardToDelete(null); }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={handleDeleteCard}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </PromptModal>

        {/* Dropdown Menu - Positioned outside table */}
        {openDropdown && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setOpenDropdown(null)}
            />
            <div 
              className="fixed z-50 bg-white rounded-md shadow-lg border border-gray-200 w-48"
              style={{
                left: `${dropdownPosition.x}px`,
                top: `${dropdownPosition.y}px`
              }}
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowDeleteModal(true);
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  disabled={isDeleting}
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
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
