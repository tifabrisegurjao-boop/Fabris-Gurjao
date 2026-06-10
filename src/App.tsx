import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import Login from './components/Login';
import { Loader2 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import FolderGenerator from './components/FolderGenerator';
import CodeGenerator from './components/CodeGenerator';
import SplashScreen from './components/SplashScreen';
import ImportData from './components/ImportData';
import ContractList from './components/ContractList';
import OrganizerPage from './components/OrganizerPage';

type Page = 'dashboard' | 'folder' | 'code' | 'history' | 'import' | 'organizer';

function App() {
    const [page, setPage] = useState<Page>('dashboard');
    const [showSplash, setShowSplash] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#050511] text-cyan-400 flex flex-col items-center justify-center font-mono">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p className="text-xs uppercase tracking-[0.3em]">Autenticando...</p>
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

    return (
        <div className="relative min-h-screen font-sans antialiased text-slate-100 bg-[#0f172a]">
            {/* Splash Screen Overlay */}
            {showSplash && (
                <SplashScreen onFinish={() => setShowSplash(false)} />
            )}

            {/* Main Content - Always rendered behind splash for smooth transition */}
            <main className={showSplash ? 'opacity-0' : 'animate-fade-in'}>
                {page === 'dashboard' && (
                    <Dashboard onNavigate={(p) => setPage(p)} />
                )}

                {page === 'folder' && (
                    <FolderGenerator onBack={() => setPage('dashboard')} />
                )}

                {page === 'code' && (
                    <CodeGenerator onBack={() => setPage('dashboard')} />
                )}

                {page === 'history' && (
                    <ContractList onBack={() => setPage('dashboard')} />
                )}

                {page === 'import' && (
                    <ImportData onBack={() => setPage('dashboard')} />
                )}

                {page === 'organizer' && (
                    <OrganizerPage onBack={() => setPage('dashboard')} />
                )}
            </main>
        </div>
    );
}

export default App;
