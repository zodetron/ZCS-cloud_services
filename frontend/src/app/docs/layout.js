import Link from 'next/link';
import { DocsNav } from './docs-nav';

export const metadata = {
  title: 'API Documentation — ZCS',
  description: 'Complete API reference for Zodetron Cloud Services — ZCS object storage platform.',
};

export default function DocsLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-white/6 bg-[#080808]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">Z</span>
              </div>
              <span className="font-semibold text-white/90 text-sm">ZCS</span>
            </Link>
            <span className="text-white/15">|</span>
            <span className="text-sm text-white/40">API Reference</span>
          </div>
          <DocsNav />
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  );
}
