export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-[rgb(0_32_96)] mb-8">Tailwind CSS Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Test Card 1 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Styling</h2>
            <p className="text-gray-600 mb-4">This card tests basic Tailwind classes.</p>
            <button className="bg-[rgb(0_32_96)] text-white px-4 py-2 rounded-md hover:bg-[rgb(0_24_72)] transition-colors">
              Test Button
            </button>
          </div>

          {/* Test Card 2 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Colors</h2>
            <div className="space-y-2">
              <div className="bg-red-500 text-white p-2 rounded">Red</div>
              <div className="bg-green-500 text-white p-2 rounded">Green</div>
              <div className="bg-[rgb(0_32_96)] text-white p-2 rounded">Navy Blue</div>
            </div>
          </div>

          {/* Test Card 3 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Responsive</h2>
            <p className="text-sm md:text-base lg:text-lg text-gray-600">
              This text should be different sizes on different screens.
            </p>
          </div>
        </div>

        {/* Test Form */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Elements</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Input
              </label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] focus:border-transparent"
                placeholder="Type something..."
              />
            </div>
            <button className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors">
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
