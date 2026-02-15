import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth({ onAuthSuccess }) {
    const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            
            if (data.user) {
                onAuthSuccess(data.user);
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name,
                    }
                }
            });

            if (error) throw error;
            
            setMessage({ 
                type: 'success', 
                text: 'Compte créé ! Vérifiez votre email pour confirmer.' 
            });
            
            setEmail('');
            setPassword('');
            setName('');
            
            setTimeout(() => setMode('login'), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;
            
            setMessage({ 
                type: 'success', 
                text: 'Email de réinitialisation envoyé !' 
            });
            
            setTimeout(() => setMode('login'), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">🌸</div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 via-rose-500 to-pink-600 bg-clip-text text-transparent mb-2" 
                        style={{fontFamily: "'Playfair Display', serif"}}>
                        VitaTrack
                    </h1>
                    <p className="text-lg text-orange-700 font-medium">
                        Votre compagnon santé personnalisé
                    </p>
                </div>

                <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-white/30">
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setMode('login')}
                            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                                mode === 'login'
                                    ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg'
                                    : 'bg-white/60 text-gray-700 hover:bg-white/80'
                            }`}
                        >
                            Connexion
                        </button>
                        <button
                            onClick={() => setMode('signup')}
                            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                                mode === 'signup'
                                    ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg'
                                    : 'bg-white/60 text-gray-700 hover:bg-white/80'
                            }`}
                        >
                            Inscription
                        </button>
                    </div>

                    {message.text && (
                        <div className={`mb-4 p-4 rounded-xl ${
                            message.type === 'error' 
                                ? 'bg-red-100 text-red-700 border-2 border-red-200' 
                                : 'bg-green-100 text-green-700 border-2 border-green-200'
                        }`}>
                            {message.text}
                        </div>
                    )}

                    {mode === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-500 focus:outline-none transition-all bg-white"
                                    placeholder="votre@email.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Mot de passe
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-500 focus:outline-none transition-all bg-white"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => setMode('forgot')}
                                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                            >
                                Mot de passe oublié ?
                            </button>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-xl hover:shadow-xl transition-all disabled:opacity-50"
                            >
                                {loading ? 'Connexion...' : 'Se connecter'}
                            </button>
                        </form>
                    )}

                    {mode === 'signup' && (
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Prénom
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-500 focus:outline-none transition-all bg-white"
                                    placeholder="Marie"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-500 focus:outline-none transition-all bg-white"
                                    placeholder="votre@email.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Mot de passe
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-500 focus:outline-none transition-all bg-white"
                                    placeholder="••••••••"
                                />
                                <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-xl hover:shadow-xl transition-all disabled:opacity-50"
                            >
                                {loading ? 'Création...' : 'Créer mon compte'}
                            </button>
                        </form>
                    )}

                    {mode === 'forgot' && (
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <p className="text-sm text-gray-600 mb-4">
                                Entrez votre email pour recevoir un lien de réinitialisation.
                            </p>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-500 focus:outline-none transition-all bg-white"
                                    placeholder="votre@email.com"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-xl hover:shadow-xl transition-all disabled:opacity-50"
                            >
                                {loading ? 'Envoi...' : 'Envoyer le lien'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="w-full text-sm text-orange-600 hover:text-orange-700 font-medium"
                            >
                                ← Retour à la connexion
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
