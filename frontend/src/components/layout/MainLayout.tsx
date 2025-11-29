import { type ReactNode } from 'react';
import { Navbar } from './Navbar';

interface MainLayoutProps {
    children: ReactNode;
    sidebar?: ReactNode;
}

export function MainLayout({
    children,
    sidebar,
}: MainLayoutProps) {
    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            {/* Top Navbar */}
            <Navbar />

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Hidden on < 1280px */}
                {sidebar && (
                    <div className="hidden xl:block">
                        {sidebar}
                    </div>
                )}

                {/* Center: Dashboard Grid */}
                <main
                    className="flex-1 overflow-y-auto p-6"
                    role="main"
                    aria-label="Asset dashboard"
                >
                    {children}
                </main>
            </div>
        </div>
    );
}
