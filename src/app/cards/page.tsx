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

  // Row editing states
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    name: string;
    last4: string;
    bank: string;
    type: string;
  }>({
    name: '',
    last4: '',
    bank: '',
    type: '',
  });
  const [isRowSaving, setIsRowSaving] = useState(false);

  useEffect(() => {
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

  // Row editing functions
  const handleEditClick = (card: any) => {
    setEditingRowId(card.id);
    setEditValues({
      name: card.name || '',
      last4: card.last4 || '',
      bank: card.bank || '',
      type: card.type || '',
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValues({ ...editValues, [e.target.name]: e.target.value });
  };

  const handleEditCancel = () => {
    setEditingRowId(null);
    setEditValues({
      name: '',
      last4: '',
      bank: '',
      type: '',
    });
  };

  const handleEditSave = async (card: any) => {
    setIsRowSaving(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const res = await fetch(`/api/cards/${card.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editValues.name,
          last4: editValues.last4,
          bank: editValues.bank,
          type: editValues.type,
        }),
      });

      if (res.ok) {
        // Update local state
        setCards(prev => prev.map(item => 
          item.id === card.id 
            ? {
                ...item,
                name: editValues.name,
                last4: editValues.last4,
                bank: editValues.bank,
                type: editValues.type,
              }
            : item
        ));
        setEditingRowId(null);
        setEditValues({
          name: '',
          last4: '',
          bank: '',
          type: '',
        });
      } else {
        const data = await res.json();
        console.error('Failed to update card:', data.error);
      }
    } catch (error) {
      console.error('Error updating card:', error);
    } finally {
      setIsRowSaving(false);
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
    event.stopPropagation();
    if (openDropdown === cardId) {
      setOpenDropdown(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      x: rect.right - 192,
      y: rect.bottom + 5
    });
    setOpenDropdown(cardId);
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
                        <TableCell>
                          {editingRowId === card.id ? (
                            <input
                              type="text"
                              name="name"
                              value={editValues.name}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          ) : (
                            card.name
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === card.id ? (
                            <input
                              type="text"
                              name="last4"
                              value={editValues.last4}
                              onChange={handleEditChange}
                              maxLength={4}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          ) : (
                            card.last4 || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === card.id ? (
                            <input
                              type="text"
                              name="bank"
                              value={editValues.bank}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          ) : (
                            card.bank || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === card.id ? (
                            <input
                              type="text"
                              name="type"
                              value={editValues.type}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          ) : (
                            card.type || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(card.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {editingRowId === card.id ? (
                            <div className="flex gap-2">
                              <button
                                className="px-2 py-1 bg-primary text-white rounded flex items-center justify-center text-sm"
                                onClick={() => handleEditSave(card)}
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
                              onClick={(e) => toggleDropdown(card.id, e)}
                              disabled={isDeleting}
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
                    const card = cards.find((item) => item.id === openDropdown);
                    if (card) handleEditClick(card);
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
                    const card = cards.find((item) => item.id === openDropdown);
                    if (card) {
                      setCardToDelete(card);
                      setShowDeleteModal(true);
                    }
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
