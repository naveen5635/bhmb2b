import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Toaster } from '@/components/ui/toast';

export function Layout() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f172a] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-[#0f172a]">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
