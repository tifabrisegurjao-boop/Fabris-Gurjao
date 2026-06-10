import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { KeyRound, Mail, Scale, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import MatrixRain from './MatrixRain';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (err: any) {
            console.error('Erro de login:', err);
            // Localizar mensagens de erro comuns do Firebase Auth
            switch (err.code) {
                case 'auth/invalid-email':
                    setError('O e-mail digitado é inválido.');
                    break;
                case 'auth/user-disabled':
                    setError('Este usuário foi desativado.');
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    setError('E-mail ou senha incorretos.');
                    break;
                case 'auth/too-many-requests':
                    setError('Muitas tentativas malsucedidas. Tente novamente mais tarde.');
                    break;
                default:
                    setError('Falha ao realizar login. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 bg-black overflow-hidden font-mono text-slate-100">
            {/* Fundo Matrix Rain */}
            <MatrixRain />

            <div className="z-10 w-full max-w-md">
                <div className="bg-slate-950/80 backdrop-blur-2xl border border-cyan-500/30 p-8 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden">
                    
                    {/* Glowing effect inside card */}
                    <div className="absolute -top-20 -left-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

                    {/* Logo/Header */}
                    <div className="text-center mb-8 relative">
                        <div className="inline-flex p-3.5 bg-cyan-500/10 rounded-2xl mb-4 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                            <Scale className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                            LEGAL SUITE
                        </h1>
                        <p className="text-[10px] text-cyan-500/60 tracking-[0.4em] uppercase mt-2">NEXUS SECURE ACCESS</p>
                    </div>

                    {/* Error Box */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3 text-xs leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email Field */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold ml-1 flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5" /> E-mail
                            </label>
                            <input
                                id="login-email"
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-slate-900/50 border border-cyan-500/20 rounded-xl px-4 py-3.5 text-cyan-100 placeholder:text-cyan-500/20 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-sans text-sm"
                                placeholder="Digite seu e-mail de acesso"
                                autoComplete="username"
                            />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold ml-1 flex items-center gap-1.5">
                                <KeyRound className="w-3.5 h-3.5" /> Senha
                            </label>
                            <input
                                id="login-password"
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-slate-900/50 border border-cyan-500/20 rounded-xl px-4 py-3.5 text-cyan-100 placeholder:text-cyan-500/20 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-sans text-sm"
                                placeholder="Digite sua senha de acesso"
                                autoComplete="current-password"
                            />
                        </div>

                        {/* Action Button */}
                        <button
                            id="login-submit-btn"
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-900 to-blue-900 border border-cyan-500/30 hover:border-cyan-400/50 text-cyan-100 font-bold tracking-wider hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 uppercase text-xs"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
                                </>
                            ) : (
                                "ACESSAR SISTEMA"
                            )}
                        </button>
                    </form>
                    <a
                        href="../"
                        className="mt-6 flex items-center justify-center gap-2 text-xs text-cyan-500/60 hover:text-cyan-400 font-mono tracking-widest transition-all duration-300"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar ao Portal
                    </a>
                </div>
            </div>
        </div>
    );
}
