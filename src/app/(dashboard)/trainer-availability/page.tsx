'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { TrainerAvailabilityManager } from '@/components/TrainerAvailabilityManager';
import { Card, CardContent } from '@/components/ui/card';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function TrainerAvailabilityPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">Please log in to access this page.</p>
        </CardContent>
      </Card>
    );
  }

  if (user.role !== 'trainer' && user.role !== 'admin') {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Trainer Access Only</h3>
          <p className="text-gray-600">
            This page is only available to trainers. If you are a trainer, please contact an administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <TrainerAvailabilityManager trainer={user} />;
}