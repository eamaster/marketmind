import { useState, type ReactNode, cloneElement, isValidElement } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface MainLayoutProps {
    children: ReactNode;
    sidebar?: ReactNode;
    bottomBar?: ReactNode;
}

export function MainLayout({
    children,
    sidebar,
    bottomBar,
}: MainLayoutProps) {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // Clone sidebar to inject props if it's a valid element
    const sidebarWithProps = isValidElement(sidebar)
        ? cloneElement(sidebar as any, {
            isOpen: isMobileSidebarOpen,
            onClose: () => setIsMobileSidebarOpen(false),
        })
        : sidebar;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {/* Top Navbar */}
            <Navbar onMenuClick={() => setIsMobileSidebarOpen(true)} />

            {/* News Ticker (Top Bar) */}
            {bottomBar}

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Sidebar - Now handles its own responsive visibility */}
                {sidebarWithProps}

                {/* Center: Dashboard Grid */}
                <main
                    className="flex-1 overflow-y-auto p-4 sm:p-6 w-full"
                    role="main"
                    aria-label="Asset dashboard"
                >
                    {children}
                    <Footer />
                </main>
            </div>

        </div>

    );
}
