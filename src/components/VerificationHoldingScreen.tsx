'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

export function VerificationHoldingScreen() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="border-2 border-amber-300 bg-amber-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-full">
              <ClockIcon className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Verification Pending</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            Thank you for registering with Just Dogs Farm! Your account is currently under review.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Our team will verify your information shortly. Once approved, you'll be able to:
          </p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Book farm sessions for your dogs</span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Schedule training and activities</span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Communicate with trainers</span>
            </li>
          </ul>
          <div className="pt-4 border-t border-amber-200">
            <p className="text-sm text-gray-600">
              <strong>What you can do now:</strong> You can add your dog profiles and browse our news and events while you wait for verification.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-amber-200">
            <p className="text-sm text-gray-600">
              <strong>Need help?</strong> Contact us if you have any questions about your verification status.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
