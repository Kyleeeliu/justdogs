import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(0_32_96)] from-opacity-5 via-white to-orange-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-3">
                <Image
                  src="/images/icons/logo.png"
                  alt="Just Dogs Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain"
                />
              </div>
              <h1 className="text-3xl font-bold text-[rgb(0_32_96)]">Just Dogs</h1>
            </div>
          </Link>
          <p className="text-gray-600">Training Management Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
