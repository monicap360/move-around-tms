export default function HomePage() {
  return (
    <main className="flex h-screen flex-col items-center justify-center bg-gray-50 text-center">
      <h1 className="text-4xl font-bold mb-4 text-gray-800">
        Welcome to MoveAround TMS 🚚
      </h1>
      <p className="text-gray-600">Please <a href="/login" className="text-blue-600 underline">log in</a> to access your dashboard.</p>
    </main>
  );
}
