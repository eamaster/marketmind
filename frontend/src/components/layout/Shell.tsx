import type { ReactNode } from 'react';
import { TopBar } from './TopBar';

interface ShellProps {
    children: ReactNode;
}

export function Shell({ children }: ShellProps) {
    return (
        <div className="min-h-screen bg-gray-50">
            <TopBar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
