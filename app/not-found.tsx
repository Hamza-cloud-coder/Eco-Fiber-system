import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">Not Found</h1>
      <p className="mb-4">Could not find the requested resource</p>
      <Link href="/" className="text-indigo-600 hover:text-indigo-800">Return Home</Link>
    </div>
  );
}
