import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface OrderModalProps {
  isOpen: boolean;
  order: any;
  onClose: () => void;
  adminT: (key: string) => string;
  isRTL: boolean;
}

export default function OrderModal({ isOpen, order, onClose, adminT, isRTL }: OrderModalProps) {
  const [orderData, setOrderData] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize order data when modal opens
  useEffect(() => {
    if (isOpen && order) {
      console.log('🎯 OrderModal opened with order:', order.id);
      setOrderData({ ...order });
    }
  }, [isOpen, order]);

  // Prevent closing on any external factors
  useEffect(() => {
    if (isOpen) {
      console.log('🔒 OrderModal is open, preventing auto-close');
    }
  }, [isOpen]);

  const updateOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/orders/${order.id}`, data);
    },
    onSuccess: () => {
      console.log('✅ Order updated successfully in OrderModal');
      toast({
        title: adminT('orders.updated'),
        description: adminT('orders.updateSuccess'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      handleClose();
    },
    onError: (error) => {
      console.error('❌ Order update failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    console.log('🔒 OrderModal handleClose called');
    setOrderData(null);
    onClose();
  };

  const handleSave = () => {
    if (!orderData) return;
    
    console.log('💾 Saving order changes:', orderData.id);
    updateOrderMutation.mutate(orderData);
  };

  const handleStatusChange = (newStatus: string) => {
    setOrderData(prev => prev ? { ...prev, status: newStatus } : null);
  };

  if (!isOpen || !order) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onMouseDown={(e) => {
        // Only close if clicking the backdrop
        if (e.target === e.currentTarget) {
          console.log('🎯 OrderModal backdrop clicked');
          handleClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-4xl max-h-[95vh] overflow-y-auto w-full mx-4"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="border-b pb-4 mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">
                {adminT('orders.order')} #{order.id}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {adminT('orders.editOrderDetails')}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              ×
            </button>
          </div>

          {/* Order Details */}
          {orderData && (
            <div className="space-y-6">
              {/* Status */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {adminT('orders.status')}
                </Label>
                <Select
                  value={orderData.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="preparing">Preparing</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Customer Name
                  </Label>
                  <Input
                    value={`${orderData.firstName || ''} ${orderData.lastName || ''}`}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Phone
                  </Label>
                  <Input
                    value={orderData.phone || ''}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Address
                </Label>
                <Textarea
                  value={orderData.address || ''}
                  readOnly
                  className="bg-gray-50"
                  rows={2}
                />
              </div>

              {/* Order Items */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Order Items
                </Label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  {orderData.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <span>{item.name}</span>
                      <span>Qty: {item.quantity} × ₪{item.price}</span>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t font-semibold flex justify-between">
                    <span>Total:</span>
                    <span>₪{orderData.totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="outline" onClick={handleClose}>
                  {adminT('actions.cancel')}
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={updateOrderMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {updateOrderMutation.isPending ? adminT('common.saving') : adminT('common.saveChanges')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}