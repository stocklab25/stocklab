'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import PageContainer from '@/components/PageContainer';
import { Card as UICard } from '@/components/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table';
import Button from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Badge from '@/components/Badge';

interface Store {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export default function StoresPage() {
  const { getAuthToken } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'CLOSED',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      const res = await fetch('/api/stores', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setStores(Array.isArray(data) ? data : []);
      } else {
        setError(data.error || 'Failed to fetch stores');
      }
    } catch (e) {
      setError('Failed to fetch stores');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setForm({ name: '', address: '', phone: '', email: '', status: 'ACTIVE' });
    setSubmitError(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (store: Store) => {
    setSelectedStore(store);
    setForm({
      name: store.name,
      address: store.address || '',
      phone: store.phone || '',
      email: store.email || '',
      status: store.status,
    });
    setSubmitError(null);
    setShowEditModal(true);
  };

  const handleOpenDeleteModal = (store: Store) => {
    setSelectedStore(store);
    setShowDeleteModal(true);
  };

  const handleCloseModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedStore(null);
    setSubmitError(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        handleCloseModals();
        fetchStores();
      } else {
        setSubmitError(data.error || 'Failed to add store');
      }
    } catch (e) {
      setSubmitError('Failed to add store');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;
    
    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      const res = await fetch(`/api/stores/${selectedStore.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        handleCloseModals();
        fetchStores();
      } else {
        setSubmitError(data.error || 'Failed to update store');
      }
    } catch (e) {
      setSubmitError('Failed to update store');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStore = async () => {
    if (!selectedStore) return;
    
    setSubmitting(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      const res = await fetch(`/api/stores/${selectedStore.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        handleCloseModals();
        fetchStores();
      } else {
        setSubmitError(data.error || 'Failed to delete store');
      }
    } catch (e) {
      setSubmitError('Failed to delete store');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'INACTIVE':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Inactive</Badge>;
      case 'CLOSED':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <PageContainer>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Stores</h1>
              <p className="text-muted-foreground mt-1">
                Manage your store locations and information
              </p>
            </div>
            <Button onClick={handleOpenAddModal}>
              <span className="mr-2">+</span>
              Add Store
            </Button>
          </div>

          {/* Stores Table */}
          <UICard>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading stores...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">{error}</div>
              ) : stores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No stores found.</div>
              ) : (
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell>{store.address || '-'}</TableCell>
                        <TableCell>{store.phone || '-'}</TableCell>
                        <TableCell>{store.email || '-'}</TableCell>
                        <TableCell>{getStatusBadge(store.status)}</TableCell>
                        <TableCell>{new Date(store.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditModal(store)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleOpenDeleteModal(store)}
                            >
                              Delete
                            </Button>
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

        {/* Add Store Modal */}
        <Modal
          open={showAddModal}
          onClose={handleCloseModals}
        >
          <div>
            <h2 className="text-xl font-bold mb-4">Add Store</h2>
            <form onSubmit={handleAddStore} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Store Name *</label>
                <Input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  required
                  placeholder="Enter store name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <Input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleFormChange}
                  placeholder="Enter store address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleFormChange}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <Select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="CLOSED">Closed</option>
                </Select>
              </div>
              {submitError && <div className="text-red-500 text-sm">{submitError}</div>}
              <div className="flex space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseModals} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Store'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>

        {/* Edit Store Modal */}
        <Modal
          open={showEditModal}
          onClose={handleCloseModals}
        >
          <div>
            <h2 className="text-xl font-bold mb-4">Edit Store</h2>
          <form onSubmit={handleEditStore} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Store Name *</label>
              <Input
                type="text"
                name="name"
                value={form.name}
                onChange={handleFormChange}
                required
                placeholder="Enter store name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <Input
                type="text"
                name="address"
                value={form.address}
                onChange={handleFormChange}
                placeholder="Enter store address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <Input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleFormChange}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                name="email"
                value={form.email}
                onChange={handleFormChange}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <Select
                name="status"
                value={form.status}
                onChange={handleFormChange}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="CLOSED">Closed</option>
              </Select>
            </div>
            {submitError && <div className="text-red-500 text-sm">{submitError}</div>}
            <div className="flex space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModals} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Store'}
              </Button>
            </div>
          </form>
          </div>
        </Modal>

        {/* Delete Store Modal */}
        <Modal
          open={showDeleteModal}
          onClose={handleCloseModals}
        >
          <div>
            <h2 className="text-xl font-bold mb-4">Delete Store</h2>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete <strong>{selectedStore?.name}</strong>? 
              This action cannot be undone.
            </p>
            {submitError && <div className="text-red-500 text-sm">{submitError}</div>}
            <div className="flex space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModals} disabled={submitting}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={handleDeleteStore} disabled={submitting}>
                {submitting ? 'Deleting...' : 'Delete Store'}
              </Button>
            </div>
          </div>
          </div>
        </Modal>
      </PageContainer>
    </Layout>
  );
} 