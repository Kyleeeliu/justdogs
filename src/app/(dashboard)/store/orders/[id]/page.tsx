'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  CheckCircleIcon,
  ClockIcon,
  ShoppingBagIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  store_items: {
    name: string;
    price: number;
  };
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  notes: string;
  collection_note: string;
  total_amount: number;
  created_at: string;
  approved_at: string;
  store_order_items: OrderItem[];
}

const formatZAR = (amount: number) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount);

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadOrder();
    }
  }, [params.id]);

  const loadOrder = async () => {
    try {
      const response = await fetch(`/api/store/orders/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      } else if (response.status === 404) {
        router.push('/store');
      }
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Order not found</h3>
        <p className="text-gray-600 mb-6">The order you're looking for doesn't exist or you don't have access to it.</p>
        <Button onClick={() => router.push('/store')} className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)]/90">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Store
        </Button>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (order.status) {
      case 'approved':
        return <CheckCircleIcon className="h-8 w-8 text-green-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-8 w-8 text-blue-500" />;
      default:
        return <ClockIcon className="h-8 w-8 text-yellow-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (order.status) {
      case 'pending':
        return {
          title: 'Order Submitted Successfully!',
          message: 'Your order has been submitted and is pending admin approval. You\'ll receive a collection note once it\'s ready.',
          color: 'text-yellow-600'
        };
      case 'approved':
        return {
          title: 'Order Approved!',
          message: 'Your order has been approved and is ready for collection.',
          color: 'text-green-600'
        };
      case 'completed':
        return {
          title: 'Order Completed',
          message: 'Your order has been completed.',
          color: 'text-blue-600'
        };
      default:
        return {
          title: 'Order Status',
          message: 'Your order status has been updated.',
          color: 'text-gray-600'
        };
    }
  };

  const statusInfo = getStatusMessage();

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
          <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
          <p className="text-gray-600">Order #{order.order_number}</p>
        </div>
      </div>

      {/* Status Card */}
      <Card className="p-6 text-center">
        <div className="flex flex-col items-center space-y-4">
          {getStatusIcon()}
          <div>
            <h2 className={`text-xl font-semibold ${statusInfo.color}`}>
              {statusInfo.title}
            </h2>
            <p className="text-gray-600 mt-2">{statusInfo.message}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Order Items</h3>
            <div className="space-y-4">
              {order.store_order_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <ShoppingBagIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <h4 className="font-medium">{item.store_items.name}</h4>
                      <p className="text-sm text-gray-600">
                        {formatZAR(item.unit_price)} × {item.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatZAR(item.total_price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-medium capitalize ${statusInfo.color}`}>
                  {order.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Payment:</span>
                <span className="font-medium">
                  {order.payment_method === 'invoice' ? 'Add to Invoice' : 'Pay Separately'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Order Date:</span>
                <span className="font-medium">
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>
              {order.approved_at && (
                <div className="flex justify-between">
                  <span>Approved:</span>
                  <span className="font-medium">
                    {new Date(order.approved_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-[rgb(0_32_96)]">{formatZAR(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Notes */}
          {(order.notes || order.collection_note) && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Notes</h3>
              <div className="space-y-3">
                {order.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Your Notes:</p>
                    <p className="text-sm text-gray-600 mt-1">{order.notes}</p>
                  </div>
                )}
                {order.collection_note && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Collection Instructions:</p>
                    <p className="text-sm text-gray-600 mt-1 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      {order.collection_note}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={() => router.push('/store')}
              className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)]/90"
            >
              Continue Shopping
            </Button>
            
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="w-full"
            >
              Print Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}