'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client-browser';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ImageUpload } from '@/components/ImageUpload';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShoppingBagIcon,
  EyeIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  photo_url: string;
  tags: string[];
  price: number;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  payment_method: string;
  notes: string;
  admin_notes: string;
  collection_note: string;
  total_amount: number;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
  store_order_items: Array<{
    quantity: number;
    unit_price: number;
    total_price: number;
    store_items: {
      name: string;
      price: number;
    };
  }>;
}

export default function StoreManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'items' | 'orders'>('items');
  const [items, setItems] = useState<StoreItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Form state for item creation/editing
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    photo_url: '',
    tags: '',
    price: '',
    stock_quantity: '',
    is_active: true
  });

  useEffect(() => {
    if (activeTab === 'items') {
      loadItems();
    } else {
      loadOrders();
    }
  }, [activeTab]);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/store/items');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/store/orders', {
        headers: authHeaders
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    // Validation
    if (!itemForm.name.trim()) {
      alert('Name is required');
      return;
    }
    if (!itemForm.price || isNaN(parseFloat(itemForm.price)) || parseFloat(itemForm.price) < 0) {
      alert('Please enter a valid price');
      return;
    }
    if (!itemForm.stock_quantity || isNaN(parseInt(itemForm.stock_quantity)) || parseInt(itemForm.stock_quantity) < 0) {
      alert('Please enter a valid stock quantity');
      return;
    }

    try {
      const itemData: any = {
        ...itemForm,
        tags: itemForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        price: parseFloat(itemForm.price),
        stock_quantity: parseInt(itemForm.stock_quantity)
      };

      const method = editingItem ? 'PUT' : 'POST';
      
      if (editingItem) {
        itemData.id = editingItem.id;
      }

      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/store/items', {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(itemData)
      });

      if (response.ok) {
        // Close modal and reset form
        setShowItemModal(false);
        setEditingItem(null);
        setItemForm({
          name: '',
          description: '',
          photo_url: '',
          tags: '',
          price: '',
          stock_quantity: '',
          is_active: true
        });
        
        // Reload items
        await loadItems();
        
        // Show success message
        alert(editingItem ? 'Item updated successfully!' : 'Item created successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to save item'}`);
      }
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item. Please try again.');
    }
  };

  const handleEditItem = (item: StoreItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description,
      photo_url: item.photo_url,
      tags: item.tags.join(', '),
      price: item.price.toString(),
      stock_quantity: item.stock_quantity.toString(),
      is_active: item.is_active
    });
    setShowItemModal(true);
  };

  const handleApproveOrder = async (order: Order) => {
    const collectionNote = prompt('Enter collection note for the customer:');
    if (collectionNote === null) return; // User cancelled

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/store/orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          id: order.id,
          status: 'approved',
          collection_note: collectionNote
        })
      });

      if (response.ok) {
        loadOrders();
      }
    } catch (error) {
      console.error('Error approving order:', error);
    }
  };

  const exportOrders = async () => {
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/store/orders/export', {
        headers: authHeaders
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `store-orders-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting orders:', error);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You need admin privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Management</h1>
          <p className="text-gray-600">Manage store items and orders</p>
        </div>
        
        <div className="flex gap-2">
          {activeTab === 'orders' && (
            <Button onClick={exportOrders} variant="outline">
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export Orders
            </Button>
          )}
          {activeTab === 'items' && (
            <Button onClick={() => setShowItemModal(true)} className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)]/90">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('items')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'items'
                ? 'border-[rgb(0_32_96)] text-[rgb(0_32_96)]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Store Items
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'orders'
                ? 'border-[rgb(0_32_96)] text-[rgb(0_32_96)]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Orders
          </button>
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]"></div>
        </div>
      ) : activeTab === 'items' ? (
        /* Store Items */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="aspect-square bg-gray-100 relative">
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBagIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                
                {!item.is_active && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    Inactive
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{item.name}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-[rgb(0_32_96)]">
                    ${item.price.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-600">
                    Stock: {item.stock_quantity}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditItem(item)}
                    className="flex-1"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Orders */
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="font-semibold text-lg">{order.order_number}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'approved' ? 'bg-green-100 text-green-800' :
                      order.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-2">
                    Customer: {order.profiles.full_name} ({order.profiles.email})
                  </p>
                  
                  <p className="text-gray-600 mb-2">
                    Payment: {order.payment_method === 'invoice' ? 'Add to Invoice' : 'Pay Separately'}
                  </p>
                  
                  <p className="font-semibold text-[rgb(0_32_96)]">
                    Total: ${order.total_amount.toFixed(2)}
                  </p>
                  
                  {order.notes && (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Customer Notes:</strong> {order.notes}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  
                  {order.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleApproveOrder(order)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h3>
            
            <div className="space-y-4">
              <Input
                placeholder="Item name"
                value={itemForm.name}
                onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
              />
              
              <textarea
                placeholder="Description"
                value={itemForm.description}
                onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image
                </label>
                <ImageUpload
                  currentImageUrl={itemForm.photo_url}
                  onImageUploaded={(imageData) => {
                    setItemForm({...itemForm, photo_url: imageData.url});
                  }}
                  onImageRemoved={() => {
                    setItemForm({...itemForm, photo_url: ''});
                  }}
                  entityType="store_item"
                  entityId={editingItem?.id}
                  altText={itemForm.name || 'Store item image'}
                />
              </div>
              
              <Input
                placeholder="Tags (comma separated)"
                value={itemForm.tags}
                onChange={(e) => setItemForm({...itemForm, tags: e.target.value})}
              />
              
              <Input
                type="number"
                step="0.01"
                placeholder="Price"
                value={itemForm.price}
                onChange={(e) => setItemForm({...itemForm, price: e.target.value})}
              />
              
              <Input
                type="number"
                placeholder="Stock quantity"
                value={itemForm.stock_quantity}
                onChange={(e) => setItemForm({...itemForm, stock_quantity: e.target.value})}
              />
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={itemForm.is_active}
                  onChange={(e) => setItemForm({...itemForm, is_active: e.target.checked})}
                />
                Active
              </label>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowItemModal(false);
                  setEditingItem(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveItem}
                className="flex-1 bg-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)]/90"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Order Details</h3>
            
            <div className="space-y-4">
              <div>
                <strong>Order Number:</strong> {selectedOrder.order_number}
              </div>
              <div>
                <strong>Customer:</strong> {selectedOrder.profiles.full_name} ({selectedOrder.profiles.email})
              </div>
              <div>
                <strong>Status:</strong> {selectedOrder.status}
              </div>
              <div>
                <strong>Payment Method:</strong> {selectedOrder.payment_method}
              </div>
              <div>
                <strong>Total:</strong> ${selectedOrder.total_amount.toFixed(2)}
              </div>
              
              {selectedOrder.notes && (
                <div>
                  <strong>Customer Notes:</strong> {selectedOrder.notes}
                </div>
              )}
              
              {selectedOrder.collection_note && (
                <div>
                  <strong>Collection Note:</strong> {selectedOrder.collection_note}
                </div>
              )}
              
              <div>
                <strong>Items:</strong>
                <ul className="mt-2 space-y-2">
                  {selectedOrder.store_order_items.map((item, index) => (
                    <li key={index} className="flex justify-between">
                      <span>{item.store_items.name} x {item.quantity}</span>
                      <span>${item.total_price.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <Button
              onClick={() => setSelectedOrder(null)}
              className="mt-6 w-full"
              variant="outline"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}