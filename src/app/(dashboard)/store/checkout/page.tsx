'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  ShoppingCartIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ArrowLeftIcon
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

const formatZAR = (amount: number) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount);

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'invoice' | 'separate'>('invoice');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const response = await fetch('/api/store/cart');
      if (response.ok) {
        const data = await response.json();
        setCart(data);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.item.price * item.quantity), 0);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      const orderData = {
        payment_method: paymentMethod,
        notes,
        total_amount: calculateTotal(),
        items: cart.map(item => ({
          store_item_id: item.store_item_id,
          quantity: item.quantity,
          unit_price: item.item.price,
          total_price: item.item.price * item.quantity
        }))
      };

      const response = await fetch('/api/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const order = await response.json();
        
        // Clear cart after successful order
        await fetch('/api/store/cart/clear', { method: 'POST' });
        
        // Redirect to order confirmation
        router.push(`/store/orders/${order.id}`);
      } else {
        const error = await response.json();
        alert(`Error submitting order: ${error.error}`);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]"></div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
        <p className="text-gray-600 mb-6">Add some items to your cart before checking out.</p>
        <Button onClick={() => router.push('/store')} className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)]/90">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Continue Shopping
        </Button>
      </div>
    );
  }

  const total = calculateTotal();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/store')}
          className="p-2"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600">Review your order and submit your request</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Summary */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4">
              {cart.map((cartItem) => (
                <div key={cartItem.store_item_id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    {cartItem.item.photo_url ? (
                      <img
                        src={cartItem.item.photo_url}
                        alt={cartItem.item.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <ShoppingCartIcon className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium">{cartItem.item.name}</h3>
                    <p className="text-sm text-gray-600">{formatZAR(cartItem.item.price)} each</p>
                    <p className="text-sm text-gray-500">Quantity: {cartItem.quantity}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold">{formatZAR(cartItem.item.price * cartItem.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Payment & Order Details */}
        <div className="space-y-6">
          {/* Payment Method */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment"
                  value="invoice"
                  checked={paymentMethod === 'invoice'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'invoice')}
                  className="text-[rgb(0_32_96)]"
                />
                <DocumentTextIcon className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium">Add to Invoice</p>
                  <p className="text-sm text-gray-600">Include in your regular billing</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment"
                  value="separate"
                  checked={paymentMethod === 'separate'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'separate')}
                  className="text-[rgb(0_32_96)]"
                />
                <CreditCardIcon className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium">Pay Separately</p>
                  <p className="text-sm text-gray-600">Handle payment independently</p>
                </div>
              </label>
            </div>
          </Card>

          {/* Order Notes */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Order Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions or notes for your order..."
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] focus:border-transparent resize-none"
              rows={4}
            />
          </Card>

          {/* Order Total */}
          <Card className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between text-lg">
                <span>Subtotal:</span>
                <span>{formatZAR(total)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax:</span>
                <span>Calculated at pickup</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span className="text-[rgb(0_32_96)]">{formatZAR(total)}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="w-full mt-6 bg-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)]/90"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting Order...
                </>
              ) : (
                'Submit Order Request'
              )}
            </Button>

            <p className="text-xs text-gray-500 mt-3 text-center">
              Your order will be submitted as a request and pending admin approval. 
              You'll receive a collection note once approved.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}