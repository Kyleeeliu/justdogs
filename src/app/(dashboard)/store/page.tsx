'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  ShoppingCartIcon, 
  PlusIcon, 
  MinusIcon,
  MagnifyingGlassIcon,
  TagIcon,
  ShoppingBagIcon
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
}

interface CartItem {
  store_item_id: string;
  quantity: number;
  item: StoreItem;
}

export default function StorePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [showCart, setShowCart] = useState(false);

  // Load store items
  useEffect(() => {
    loadStoreItems();
    loadCart();
  }, []);

  const loadStoreItems = async () => {
    try {
      const response = await fetch('/api/store/items');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error loading store items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCart = async () => {
    try {
      const response = await fetch('/api/store/cart');
      if (response.ok) {
        const data = await response.json();
        setCart(data);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const addToCart = async (itemId: string) => {
    try {
      const response = await fetch('/api/store/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_item_id: itemId, quantity: 1 })
      });
      
      if (response.ok) {
        loadCart();
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const updateCartQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    try {
      const response = await fetch('/api/store/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_item_id: itemId, quantity })
      });
      
      if (response.ok) {
        loadCart();
      }
    } catch (error) {
      console.error('Error updating cart:', error);
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const response = await fetch(`/api/store/cart?item_id=${itemId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        loadCart();
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  // Filter items based on search and tags
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || item.tags.includes(selectedTag);
    return matchesSearch && matchesTag && item.is_active;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(items.flatMap(item => item.tags)));

  // Get cart item quantity for a specific item
  const getCartQuantity = (itemId: string) => {
    const cartItem = cart.find(item => item.store_item_id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  // Calculate cart total
  const cartTotal = cart.reduce((total, item) => total + (item.item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store</h1>
          <p className="text-gray-600">Browse and purchase items for your dog</p>
        </div>
        
        {/* Cart Button */}
        <Button
          onClick={() => setShowCart(!showCart)}
          className="relative bg-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)]/90"
        >
          <ShoppingCartIcon className="h-5 w-5 mr-2" />
          Cart
          {cartItemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
              {cartItemCount}
            </span>
          )}
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] focus:border-transparent"
        >
          <option value="">All Categories</option>
          {allTags.map(tag => (
            <option key={tag} value={tag} className="capitalize">
              {tag}
            </option>
          ))}
        </select>
      </div>

      {/* Shopping Cart Sidebar */}
      {showCart && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Shopping Cart</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowCart(false)}>
              ×
            </Button>
          </div>
          
          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Your cart is empty</p>
          ) : (
            <div className="space-y-4">
              {cart.map((cartItem) => (
                <div key={cartItem.store_item_id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{cartItem.item.name}</h4>
                    <p className="text-sm text-gray-600">${cartItem.item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCartQuantity(cartItem.store_item_id, cartItem.quantity - 1)}
                    >
                      <MinusIcon className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center">{cartItem.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCartQuantity(cartItem.store_item_id, cartItem.quantity + 1)}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold">Total: ${cartTotal.toFixed(2)}</span>
                </div>
                <Button 
                  className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)]/90"
                  onClick={() => window.location.href = '/store/checkout'}
                >
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Store Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const cartQuantity = getCartQuantity(item.id);
            
            return (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Item Image */}
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
                  
                  {/* Stock indicator */}
                  {item.stock_quantity <= 5 && item.stock_quantity > 0 && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                      Low Stock
                    </div>
                  )}
                  {item.stock_quantity === 0 && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                      Out of Stock
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{item.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                  
                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                        >
                          <TagIcon className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[rgb(0_32_96)]">
                      ${item.price.toFixed(2)}
                    </span>
                    
                    {cartQuantity > 0 ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.id, cartQuantity - 1)}
                        >
                          <MinusIcon className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{cartQuantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.id, cartQuantity + 1)}
                          disabled={cartQuantity >= item.stock_quantity}
                        >
                          <PlusIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => addToCart(item.id)}
                        disabled={item.stock_quantity === 0}
                        className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)]/90"
                      >
                        <ShoppingCartIcon className="h-4 w-4 mr-1" />
                        Add to Cart
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}