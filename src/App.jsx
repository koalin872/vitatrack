import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from 'recharts';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import Admin from './Admin';
import { useUserData } from './useUserData';

export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        // Vérifier la session au chargement
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            checkAdmin(session?.user);
            setLoading(false);
        });

        // Écouter les changements d'authentification
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            checkAdmin(session?.user);
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkAdmin = (currentUser) => {
        // Liste des emails admin (à personnaliser)
        const adminEmails = ['admin@ideaofgenius.com'];
        setIsAdmin(currentUser && adminEmails.includes(currentUser.email));
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setIsAdmin(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 flex items-center justify-center">
                <div className="text-2xl text-orange-600">Chargement...</div>
            </div>
        );
    }

    // Si pas connecté, afficher la page d'authentification
    if (!user) {
        return <Auth onAuthSuccess={(user) => setUser(user)} />;
    }

    // Si admin, afficher le dashboard admin
    if (isAdmin) {
        return <Admin user={user} onLogout={handleLogout} />;
    }

    // Sinon, afficher l'application normale
    return <VitaTrackApp user={user} onLogout={handleLogout} />;
}

function VitaTrackApp({ user, onLogout }) {
    // Utiliser le hook pour charger les vraies données
    const {
        userData,
        setUserData,
        weightHistory,
        setWeightHistory,
        biorhythmHistory,
        setBiorhythmHistory,
        points,
        setPoints,
        streak,
        setStreak,
        loading: dataLoading,
        saveProfile,
        addMeasurement: saveMeasurement,
        saveBiorhythm,
        awardBadgeBonuses
    } = useUserData(user);

    const [activeTab, setActiveTab] = useState('dashboard');

    const [todayBio, setTodayBio] = useState({
        sleep: 7.5,
        mood: 8,
        energy: 8,
        stress: 3
    });

    const [newMeasurement, setNewMeasurement] = useState({
        weight: 70,
        chest: 92,
        waist: 74,
        hips: 98,
        thigh: 55,
        arm: 28.5
    });

    // Mettre à jour newMeasurement avec le dernier poids si disponible
    useEffect(() => {
        if (weightHistory.length > 0) {
            const lastMeasurement = weightHistory[weightHistory.length - 1];
            setNewMeasurement({
                weight: lastMeasurement.weight,
                chest: lastMeasurement.chest,
                waist: lastMeasurement.waist,
                hips: lastMeasurement.hips,
                thigh: lastMeasurement.thigh,
                arm: lastMeasurement.arm
            });
        }
    }, [weightHistory]);

    // Calculer la série maximale à partir de l'historique réel des biorythmes
    const computeMaxStreak = (bioHistory) => {
        if (!bioHistory || bioHistory.length === 0) return 0;
        const dates = [...new Set(bioHistory.map(b => b.date))].sort();
        if (dates.length === 0) return 0;

        let maxStreak = 1;
        let currentStreak = 1;

        for (let i = 1; i < dates.length; i++) {
            const prev = new Date(dates[i - 1]);
            const curr = new Date(dates[i]);
            const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else if (diffDays > 1) {
                currentStreak = 1;
            }
            // diffDays === 0 = même jour, on ignore
        }
        return maxStreak;
    };

    // Badges dynamiques — calculés à partir des vraies données utilisateur
    const badges = useMemo(() => {
        const maxStreak = Math.max(streak, computeMaxStreak(biorhythmHistory));
        const hasAnyData = weightHistory.length > 0 || biorhythmHistory.length > 0;

        // Perte de poids totale depuis le début
        const totalWeightLoss = weightHistory.length > 1
            ? weightHistory[0].weight - weightHistory[weightHistory.length - 1].weight
            : 0;

        // Zen Master : stress < 3 pendant les 7 derniers jours consécutifs
        const isZenMaster = (() => {
            if (biorhythmHistory.length < 7) return false;
            const last7 = biorhythmHistory.slice(-7);
            return last7.every(b => b.stress !== undefined && b.stress < 3);
        })();

        return [
            { id: 1, name: 'Premier Pas', icon: '🌱', desc: 'Premier jour enregistré', earned: hasAnyData, color: 'from-emerald-400 to-teal-500' },
            { id: 2, name: 'Une Semaine', icon: '⭐', desc: '7 jours consécutifs', earned: maxStreak >= 7, color: 'from-yellow-400 to-orange-500' },
            { id: 3, name: 'Deux Semaines', icon: '🔥', desc: '14 jours consécutifs', earned: maxStreak >= 14, color: 'from-orange-500 to-red-600' },
            { id: 4, name: 'Un Mois', icon: '💪', desc: '30 jours consécutifs', earned: maxStreak >= 30, color: 'from-purple-400 to-pink-500' },
            { id: 5, name: 'Trois Mois', icon: '🏃', desc: '90 jours consécutifs', earned: maxStreak >= 90, color: 'from-blue-400 to-indigo-500' },
            { id: 6, name: 'Une Année', icon: '👑', desc: '365 jours consécutifs', earned: maxStreak >= 365, color: 'from-amber-400 to-yellow-600' },
            { id: 7, name: 'Transformation', icon: '🦋', desc: '-5kg atteints', earned: totalWeightLoss >= 5, color: 'from-pink-400 to-rose-500' },
            { id: 8, name: 'Zen Master', icon: '🧘', desc: 'Stress < 3 pendant 7 jours', earned: isZenMaster, color: 'from-cyan-400 to-blue-500' }
        ];
    }, [streak, weightHistory, biorhythmHistory]);

    // Attribuer les bonus quand de nouveaux badges sont débloqués
    useEffect(() => {
        const earnedCount = badges.filter(b => b.earned).length;
        if (earnedCount > 0) {
            awardBadgeBonuses(earnedCount);
        }
    }, [badges]);

    // ═══════════════════════════════════════════
    // SYSTÈME DE NIVEAUX
    // ═══════════════════════════════════════════
    const LEVELS = [
        { level: 1,  name: 'Graine',      icon: '🌱', minPts: 0,     color: 'from-green-400 to-emerald-500' },
        { level: 2,  name: 'Bourgeon',     icon: '🌿', minPts: 100,   color: 'from-emerald-400 to-teal-500' },
        { level: 3,  name: 'Fleur',        icon: '🌸', minPts: 300,   color: 'from-pink-400 to-rose-500' },
        { level: 4,  name: 'Papillon',     icon: '🦋', minPts: 600,   color: 'from-purple-400 to-pink-500' },
        { level: 5,  name: 'Étoile',       icon: '⭐', minPts: 1000,  color: 'from-yellow-400 to-amber-500' },
        { level: 6,  name: 'Diamant',      icon: '💎', minPts: 1500,  color: 'from-cyan-400 to-blue-500' },
        { level: 7,  name: 'Experte',      icon: '🏆', minPts: 2500,  color: 'from-amber-400 to-orange-500' },
        { level: 8,  name: 'Maître',       icon: '👑', minPts: 4000,  color: 'from-orange-500 to-red-500' },
        { level: 9,  name: 'Légende',      icon: '🔥', minPts: 6000,  color: 'from-red-500 to-rose-600' },
        { level: 10, name: 'Déesse',       icon: '✨', minPts: 10000, color: 'from-amber-300 via-yellow-400 to-orange-500' }
    ];

    const currentLevel = useMemo(() => {
        let lvl = LEVELS[0];
        for (const l of LEVELS) {
            if (points >= l.minPts) lvl = l;
        }
        return lvl;
    }, [points]);

    const nextLevel = useMemo(() => {
        const idx = LEVELS.findIndex(l => l.level === currentLevel.level);
        return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
    }, [currentLevel]);

    const levelProgress = useMemo(() => {
        if (!nextLevel) return 100;
        const pointsInLevel = points - currentLevel.minPts;
        const pointsNeeded = nextLevel.minPts - currentLevel.minPts;
        return Math.min(Math.round((pointsInLevel / pointsNeeded) * 100), 100);
    }, [points, currentLevel, nextLevel]);

    // Notification level-up
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [previousLevel, setPreviousLevel] = useState(null);

    // Détecter un changement de niveau
    useEffect(() => {
        if (previousLevel !== null && currentLevel.level > previousLevel) {
            setShowLevelUp(true);
            setTimeout(() => setShowLevelUp(false), 4000);
        }
        setPreviousLevel(currentLevel.level);
    }, [currentLevel.level]);

    // Tableau des actions et points
    const POINTS_TABLE = [
        { action: 'Enregistrer une mesure',     pts: '+15', icon: '📏', freq: 'Par mesure' },
        { action: 'Enregistrer un biorythme',   pts: '+10', icon: '🌊', freq: 'Par jour' },
        { action: 'Débloquer un badge',         pts: '+50', icon: '🏅', freq: 'Par badge' },
        { action: 'Streak 7 jours',             pts: '+25', icon: '⭐', freq: 'Bonus unique' },
        { action: 'Streak 14 jours',            pts: '+50', icon: '🔥', freq: 'Bonus unique' },
        { action: 'Streak 30 jours',            pts: '+100', icon: '💪', freq: 'Bonus unique' },
        { action: 'Streak 90 jours',            pts: '+250', icon: '🏃', freq: 'Bonus unique' },
        { action: 'Streak 365 jours',           pts: '+1000', icon: '👑', freq: 'Bonus unique' }
    ];

    // Calcul des biorythmes scientifiques
    const calculateBiorhythms = () => {
        const birthDate = new Date(userData.birthDate);
        const today = new Date();
        const daysSinceBirth = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24));
        
        // Cycles standards : Physique 23j, Émotionnel 28j, Intellectuel 33j
        const physical = Math.sin((2 * Math.PI * daysSinceBirth) / 23) * 50 + 50;
        const emotional = Math.sin((2 * Math.PI * daysSinceBirth) / 28) * 50 + 50;
        const intellectual = Math.sin((2 * Math.PI * daysSinceBirth) / 33) * 50 + 50;
        
        return {
            physical: Math.round(physical),
            emotional: Math.round(emotional),
            intellectual: Math.round(intellectual)
        };
    };

    // Générer les prochains 7 jours de biorythmes
    const generateBiorhythmForecast = () => {
        const birthDate = new Date(userData.birthDate);
        const forecast = [];
        
        for (let i = 0; i <= 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const daysSinceBirth = Math.floor((date - birthDate) / (1000 * 60 * 60 * 24));
            
            const physical = Math.sin((2 * Math.PI * daysSinceBirth) / 23) * 50 + 50;
            const emotional = Math.sin((2 * Math.PI * daysSinceBirth) / 28) * 50 + 50;
            const intellectual = Math.sin((2 * Math.PI * daysSinceBirth) / 33) * 50 + 50;
            
            forecast.push({
                date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                fullDate: date.toISOString().split('T')[0],
                physical: Math.round(physical),
                emotional: Math.round(emotional),
                intellectual: Math.round(intellectual)
            });
        }
        
        return forecast;
    };

    const biorhythms = calculateBiorhythms();
    const biorhythmForecast = generateBiorhythmForecast();

    // Calculs santé
    const calculateBMR = () => {
        const { height, age, gender } = userData;
        const currentWeight = weightHistory[weightHistory.length - 1]?.weight || 70;
        if (gender === 'male') {
            return Math.round(10 * currentWeight + 6.25 * height - 5 * age + 5);
        } else {
            return Math.round(10 * currentWeight + 6.25 * height - 5 * age - 161);
        }
    };

    const calculateTDEE = () => {
        return Math.round(calculateBMR() * userData.activityLevel);
    };

    const calculateBMI = () => {
        const currentWeight = weightHistory[weightHistory.length - 1]?.weight || 70;
        const heightM = userData.height / 100;
        return (currentWeight / (heightM * heightM)).toFixed(1);
    };

    const getBMICategory = () => {
        const bmi = calculateBMI();
        if (bmi < 18.5) return { text: 'Insuffisance pondérale', color: 'text-blue-600' };
        if (bmi < 25) return { text: 'Poids santé', color: 'text-green-600' };
        if (bmi < 30) return { text: 'Surpoids', color: 'text-orange-600' };
        return { text: 'Obésité', color: 'text-red-600' };
    };

    const calculateMacros = () => {
        const tdee = calculateTDEE();
        let targetCalories = tdee;
        let proteinPercent = 25, carbPercent = 45, fatPercent = 30;

        if (userData.goal === 'loss') {
            targetCalories = tdee - 500;
            proteinPercent = 30;
            carbPercent = 40;
            fatPercent = 30;
        } else if (userData.goal === 'gain') {
            targetCalories = tdee + 300;
            proteinPercent = 25;
            carbPercent = 50;
            fatPercent = 25;
        }

        return {
            calories: targetCalories,
            protein: { g: Math.round((targetCalories * proteinPercent / 100) / 4), percent: proteinPercent },
            carbs: { g: Math.round((targetCalories * carbPercent / 100) / 4), percent: carbPercent },
            fat: { g: Math.round((targetCalories * fatPercent / 100) / 9), percent: fatPercent }
        };
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const newData = {
            ...userData,
            [name]: ['gender', 'goal', 'birthDate', 'name'].includes(name) ? value : parseFloat(value) || 0
        };
        setUserData(newData);
        // Sauvegarder dans Supabase après un délai (debounce)
        clearTimeout(window.saveProfileTimeout);
        window.saveProfileTimeout = setTimeout(() => {
            saveProfile(newData);
        }, 1000);
    };

    const handleMeasurementChange = (e) => {
        const { name, value } = e.target;
        setNewMeasurement(prev => ({
            ...prev,
            [name]: parseFloat(value) || 0
        }));
    };

    const addMeasurement = async () => {
        const success = await saveMeasurement(newMeasurement);
        if (success) {
            alert('✅ Mesure enregistrée avec succès !');
        } else {
            alert('❌ Erreur lors de l\'enregistrement');
        }
    };

    const saveTodayBiorhythm = async () => {
        const success = await saveBiorhythm(todayBio);
        if (success) {
            alert('✅ Biorythme enregistré avec succès !');
        } else {
            alert('❌ Erreur lors de l\'enregistrement');
        }
    };

    const macros = calculateMacros();
    const bmr = calculateBMR();
    const tdee = calculateTDEE();
    const bmi = calculateBMI();
    const bmiCategory = getBMICategory();

    // Calcul de la progression
    const weightChange = weightHistory.length > 1 
        ? (weightHistory[weightHistory.length - 1].weight - weightHistory[0].weight).toFixed(1)
        : 0;

    // Afficher un écran de chargement pendant que les données se chargent
    if (dataLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-bounce">🌸</div>
                    <div className="text-2xl text-orange-600">Chargement de vos données...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 p-4 md:p-8">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
                
                * { font-family: 'Inter', sans-serif; }
                
                @keyframes shimmer {
                    0% { background-position: -1000px 0; }
                    100% { background-position: 1000px 0; }
                }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(251, 146, 60, 0.4); }
                    50% { box-shadow: 0 0 40px rgba(251, 146, 60, 0.6); }
                }

                @keyframes level-up-entrance {
                    0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
                    50% { transform: scale(1.15) rotate(3deg); opacity: 1; }
                    70% { transform: scale(0.95) rotate(-1deg); }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }

                @keyframes confetti-fall {
                    0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(60px) rotate(360deg); opacity: 0; }
                }

                @keyframes badge-unlock {
                    0% { transform: scale(0) rotate(-180deg); }
                    60% { transform: scale(1.2) rotate(10deg); }
                    100% { transform: scale(1) rotate(0deg); }
                }

                .level-up-modal {
                    animation: level-up-entrance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                
                .stat-card {
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
                    backdrop-filter: blur(20px);
                }
                
                .glass-card {
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
                    backdrop-filter: blur(30px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }
                
                input[type="range"]::-webkit-slider-thumb {
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #fb923c, #f97316);
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(251, 146, 60, 0.4);
                }
                
                input[type="range"]::-webkit-slider-thumb:hover {
                    box-shadow: 0 4px 12px rgba(251, 146, 60, 0.6);
                }
            `}</style>

            <div className="max-w-7xl mx-auto">
                {/* LEVEL UP NOTIFICATION */}
                {showLevelUp && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                         onClick={() => setShowLevelUp(false)}>
                        <div className="level-up-modal bg-white rounded-3xl p-10 shadow-2xl text-center max-w-sm mx-4 relative overflow-hidden">
                            {/* Confetti decorations */}
                            <div className="absolute top-2 left-6 text-2xl" style={{animation: 'confetti-fall 1.5s ease-in forwards', animationDelay: '0.2s'}}>🎉</div>
                            <div className="absolute top-4 right-8 text-2xl" style={{animation: 'confetti-fall 1.5s ease-in forwards', animationDelay: '0.5s'}}>✨</div>
                            <div className="absolute top-1 left-1/2 text-2xl" style={{animation: 'confetti-fall 1.5s ease-in forwards', animationDelay: '0.8s'}}>🎊</div>
                            <div className="absolute top-3 right-1/4 text-xl" style={{animation: 'confetti-fall 1.5s ease-in forwards', animationDelay: '0.3s'}}>⭐</div>
                            <div className="absolute top-2 left-1/3 text-xl" style={{animation: 'confetti-fall 1.5s ease-in forwards', animationDelay: '0.6s'}}>💫</div>
                            
                            <div className="text-6xl mb-3">{currentLevel.icon}</div>
                            <div className="text-sm font-semibold text-orange-500 uppercase tracking-widest mb-2">Niveau supérieur !</div>
                            <div className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-600 via-rose-500 to-pink-600 bg-clip-text text-transparent"
                                 style={{fontFamily: "'Playfair Display', serif"}}>
                                {currentLevel.name}
                            </div>
                            <div className="text-lg text-gray-600 mb-4">Niveau {currentLevel.level}</div>
                            <div className={`inline-block px-6 py-2 rounded-full bg-gradient-to-r ${currentLevel.color} text-white font-semibold shadow-lg`}>
                                {points} points
                            </div>
                            <div className="mt-4 text-xs text-gray-400">Touchez pour fermer</div>
                        </div>
                    </div>
                )}
                {/* Header Chaleureux */}
                <header className="mb-8 md:mb-12">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex-1"></div>
                        <button
                            onClick={onLogout}
                            className="px-4 py-2 bg-white/80 hover:bg-white text-gray-700 font-semibold rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
                        >
                            Déconnexion
                        </button>
                    </div>
                    <div className="text-center">
                        <div className="inline-block mb-4">
                            <div className="text-6xl md:text-7xl animate-float" style={{animationDuration: '3s'}}>🌸</div>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-orange-600 via-rose-500 to-pink-600 bg-clip-text text-transparent mb-3" 
                            style={{fontFamily: "'Playfair Display', serif"}}>
                            VitaTrack
                        </h1>
                        <p className="text-xl md:text-2xl text-orange-700 font-medium">
                            Bonjour {userData.name}, prenez soin de vous 💕
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-4 text-sm flex-wrap">
                            <div className="px-4 py-2 bg-gradient-to-r from-orange-100 to-rose-100 rounded-full">
                                🔥 <span className="font-semibold">{streak} jours</span> de suite
                            </div>
                            <div className="px-4 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-full">
                                ⭐ <span className="font-semibold">{points} points</span>
                            </div>
                            <div className={`px-4 py-2 bg-gradient-to-r ${currentLevel.color} rounded-full text-white shadow-md`}>
                                {currentLevel.icon} <span className="font-semibold">{currentLevel.name}</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Navigation Tabs - Responsive */}
                <div className="mb-8">
                    {/* Navigation Mobile - Icônes only */}
                    <div className="flex md:hidden justify-around gap-1 px-2">
                        {[
                            { id: 'dashboard', icon: '🏠', gradient: 'from-orange-500 to-rose-500' },
                            { id: 'profile', icon: '👤', gradient: 'from-purple-500 to-pink-500' },
                            { id: 'weight', icon: '📊', gradient: 'from-blue-500 to-cyan-500' },
                            { id: 'biorhythm', icon: '🌊', gradient: 'from-teal-500 to-emerald-500' },
                            { id: 'rewards', icon: '🏆', gradient: 'from-amber-500 to-yellow-500' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-3 rounded-2xl font-semibold transition-all duration-300 text-2xl ${
                                    activeTab === tab.id
                                        ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg scale-105`
                                        : 'bg-white/60 hover:bg-white/80'
                                }`}
                            >
                                {tab.icon}
                            </button>
                        ))}
                    </div>
                    
                    {/* Navigation Desktop - Avec labels */}
                    <div className="hidden md:flex gap-2 flex-wrap justify-center">
                        {[
                            { id: 'dashboard', label: '🏠 Tableau de bord', gradient: 'from-orange-500 to-rose-500' },
                            { id: 'profile', label: '👤 Mon profil', gradient: 'from-purple-500 to-pink-500' },
                            { id: 'weight', label: '📊 Mensurations', gradient: 'from-blue-500 to-cyan-500' },
                            { id: 'biorhythm', label: '🌊 Biorythme', gradient: 'from-teal-500 to-emerald-500' },
                            { id: 'rewards', label: '🏆 Récompenses', gradient: 'from-amber-500 to-yellow-500' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-3 rounded-2xl font-semibold whitespace-nowrap transition-all duration-300 ${
                                    activeTab === tab.id
                                        ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg scale-105`
                                        : 'bg-white/60 text-gray-700 hover:bg-white/80'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { 
                                    label: 'Poids Actuel', 
                                    value: weightHistory[weightHistory.length - 1]?.weight || 70, 
                                    unit: 'kg',
                                    change: weightChange,
                                    icon: '⚖️',
                                    gradient: 'from-orange-400 to-rose-400'
                                },
                                { 
                                    label: 'IMC', 
                                    value: bmi, 
                                    unit: '',
                                    desc: bmiCategory.text,
                                    icon: '📏',
                                    gradient: 'from-purple-400 to-pink-400'
                                },
                                { 
                                    label: 'Métabolisme de Base', 
                                    value: bmr, 
                                    unit: 'kcal',
                                    icon: '🔥',
                                    gradient: 'from-amber-400 to-orange-400'
                                },
                                { 
                                    label: 'Calories Cibles', 
                                    value: macros.calories, 
                                    unit: 'kcal',
                                    icon: '🎯',
                                    gradient: 'from-cyan-400 to-blue-400'
                                }
                            ].map((stat, idx) => (
                                <div key={idx} className="stat-card rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-3xl">{stat.icon}</span>
                                        {stat.change && (
                                            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                                                stat.change < 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                                {stat.change > 0 ? '+' : ''}{stat.change} kg
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm font-semibold text-gray-600 mb-2">{stat.label}</div>
                                    <div className={`text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`} 
                                         style={{fontFamily: "'Playfair Display', serif"}}>
                                        {stat.value} <span className="text-2xl opacity-70">{stat.unit}</span>
                                    </div>
                                    {stat.desc && (
                                        <div className={`text-sm mt-2 font-semibold ${bmiCategory.color}`}>{stat.desc}</div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Courbe de Poids */}
                        <div className="glass-card rounded-3xl p-6 md:p-8 shadow-xl">
                            <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent"
                                style={{fontFamily: "'Playfair Display', serif"}}>
                                📈 Évolution du Poids
                            </h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={weightHistory}>
                                    <defs>
                                        <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#fb923c" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#fb923c" stopOpacity={0.1}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" opacity={0.3} />
                                    <XAxis 
                                        dataKey="date" 
                                        stroke="#92400e"
                                        tick={{fontSize: 12}}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                    />
                                    <YAxis 
                                        stroke="#92400e"
                                        domain={['dataMin - 2', 'dataMax + 2']}
                                        tick={{fontSize: 12}}
                                    />
                                    <Tooltip 
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: 'none',
                                            borderRadius: '12px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                        labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR')}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="weight" 
                                        stroke="#f97316" 
                                        strokeWidth={3}
                                        fill="url(#weightGradient)"
                                        name="Poids (kg)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Macros & Biorythme Today */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Macronutriments */}
                            <div className="glass-card rounded-3xl p-6 md:p-8 shadow-xl">
                                <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
                                    style={{fontFamily: "'Playfair Display', serif"}}>
                                    🍎 Macronutriments Quotidiens
                                </h2>
                                <div className="space-y-4">
                                    {[
                                        { name: 'Protéines', ...macros.protein, color: 'from-pink-500 to-rose-500', emoji: '🥩' },
                                        { name: 'Glucides', ...macros.carbs, color: 'from-amber-500 to-orange-500', emoji: '🍞' },
                                        { name: 'Lipides', ...macros.fat, color: 'from-emerald-500 to-teal-500', emoji: '🥑' }
                                    ].map((macro, idx) => (
                                        <div key={idx}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-semibold text-gray-700">{macro.emoji} {macro.name}</span>
                                                <span className="text-lg font-bold text-gray-800">{macro.g}g</span>
                                            </div>
                                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full bg-gradient-to-r ${macro.color} transition-all duration-500`}
                                                    style={{width: `${macro.percent}%`}}
                                                />
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">{macro.percent}% des calories</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Biorythme Actuel */}
                            <div className="glass-card rounded-3xl p-6 md:p-8 shadow-xl">
                                <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent"
                                    style={{fontFamily: "'Playfair Display', serif"}}>
                                    🌊 Biorythme du Jour
                                </h2>
                                <ResponsiveContainer width="100%" height={250}>
                                    <RadarChart data={[
                                        { subject: 'Physique', value: biorhythms.physical, fullMark: 100 },
                                        { subject: 'Émotionnel', value: biorhythms.emotional, fullMark: 100 },
                                        { subject: 'Intellectuel', value: biorhythms.intellectual, fullMark: 100 }
                                    ]}>
                                        <PolarGrid stroke="#14b8a6" opacity={0.3} />
                                        <PolarAngleAxis 
                                            dataKey="subject" 
                                            tick={{fill: '#0f766e', fontWeight: 600, fontSize: 12}}
                                        />
                                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{fontSize: 10}} />
                                        <Radar 
                                            name="Niveau" 
                                            dataKey="value" 
                                            stroke="#14b8a6" 
                                            fill="#14b8a6" 
                                            fillOpacity={0.6}
                                            strokeWidth={2}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                                <div className="grid grid-cols-3 gap-2 mt-4">
                                    {[
                                        { label: 'Physique', value: biorhythms.physical, emoji: '💪' },
                                        { label: 'Émotionnel', value: biorhythms.emotional, emoji: '❤️' },
                                        { label: 'Intellectuel', value: biorhythms.intellectual, emoji: '🧠' }
                                    ].map((item, idx) => (
                                        <div key={idx} className="text-center p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl">
                                            <div className="text-2xl mb-1">{item.emoji}</div>
                                            <div className="text-xs text-gray-600 mb-1">{item.label}</div>
                                            <div className="text-lg font-bold text-teal-700">{item.value}%</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PROFIL TAB */}
                {activeTab === 'profile' && (
                    <div className="max-w-3xl mx-auto">
                        <div className="glass-card rounded-3xl p-8 shadow-xl">
                            <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent text-center"
                                style={{fontFamily: "'Playfair Display', serif"}}>
                                👤 Votre Profil
                            </h2>
                            <div className="grid md:grid-cols-2 gap-6">
                                {[
                                    { label: 'Prénom', name: 'name', type: 'text', value: userData.name },
                                    { label: 'Âge', name: 'age', type: 'number', value: userData.age },
                                    { label: 'Taille (cm)', name: 'height', type: 'number', value: userData.height },
                                    { label: 'Date de naissance', name: 'birthDate', type: 'date', value: userData.birthDate }
                                ].map((field, idx) => (
                                    <div key={idx}>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            {field.label}
                                        </label>
                                        <input
                                            type={field.type}
                                            name={field.name}
                                            value={field.value}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none transition-all bg-white"
                                        />
                                    </div>
                                ))}
                                
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Sexe</label>
                                    <select
                                        name="gender"
                                        value={userData.gender}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none transition-all bg-white"
                                    >
                                        <option value="male">Homme</option>
                                        <option value="female">Femme</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Niveau d'activité</label>
                                    <select
                                        name="activityLevel"
                                        value={userData.activityLevel}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none transition-all bg-white"
                                    >
                                        <option value="1.2">🛋️ Sédentaire</option>
                                        <option value="1.375">🚶 Léger (1-3j/sem)</option>
                                        <option value="1.55">🏃 Modéré (6-7j/sem)</option>
                                        <option value="1.725">💪 Intense</option>
                                        <option value="1.9">🔥 Extrême</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Objectif</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { value: 'loss', label: 'Perte', emoji: '📉', color: 'from-green-400 to-emerald-500' },
                                            { value: 'maintain', label: 'Maintien', emoji: '⚖️', color: 'from-blue-400 to-cyan-500' },
                                            { value: 'gain', label: 'Gain', emoji: '📈', color: 'from-orange-400 to-red-500' }
                                        ].map((goal) => (
                                            <button
                                                key={goal.value}
                                                onClick={() => setUserData(prev => ({ ...prev, goal: goal.value }))}
                                                className={`p-4 rounded-xl transition-all ${
                                                    userData.goal === goal.value
                                                        ? `bg-gradient-to-br ${goal.color} text-white shadow-lg scale-105`
                                                        : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="text-3xl mb-2">{goal.emoji}</div>
                                                <div className="font-semibold">{goal.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* POIDS & MENSURATIONS TAB */}
                {activeTab === 'weight' && (
                    <div className="space-y-6">
                        {/* Formulaire d'ajout */}
                        <div className="glass-card rounded-3xl p-8 shadow-xl">
                            <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent"
                                style={{fontFamily: "'Playfair Display', serif"}}>
                                📏 Nouvelles Mesures
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                                {[
                                    { label: 'Poids', name: 'weight', unit: 'kg', emoji: '⚖️' },
                                    { label: 'Poitrine', name: 'chest', unit: 'cm', emoji: '📏' },
                                    { label: 'Taille', name: 'waist', unit: 'cm', emoji: '📐' },
                                    { label: 'Hanches', name: 'hips', unit: 'cm', emoji: '📏' },
                                    { label: 'Cuisse', name: 'thigh', unit: 'cm', emoji: '📏' },
                                    { label: 'Bras', name: 'arm', unit: 'cm', emoji: '💪' }
                                ].map((field, idx) => (
                                    <div key={idx}>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            {field.emoji} {field.label}
                                        </label>
                                        <input
                                            type="number"
                                            name={field.name}
                                            value={newMeasurement[field.name]}
                                            onChange={handleMeasurementChange}
                                            step="0.1"
                                            className="w-full px-3 py-2 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none transition-all bg-white text-center font-semibold"
                                        />
                                        <div className="text-xs text-gray-500 text-center mt-1">{field.unit}</div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={addMeasurement}
                                className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl hover:shadow-xl transition-all text-lg"
                            >
                                ✅ Enregistrer mes mesures (+15 points)
                            </button>
                        </div>

                        {/* Graphiques de mensurations */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Tour de taille */}
                            <div className="glass-card rounded-3xl p-6 shadow-xl">
                                <h3 className="text-xl font-bold mb-4 text-gray-800">📐 Tour de Taille</h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={weightHistory}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis 
                                            dataKey="date" 
                                            tick={{fontSize: 11}}
                                            tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                        />
                                        <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{fontSize: 11}} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="waist" stroke="#3b82f6" strokeWidth={3} name="Taille (cm)" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Hanches */}
                            <div className="glass-card rounded-3xl p-6 shadow-xl">
                                <h3 className="text-xl font-bold mb-4 text-gray-800">📏 Tour de Hanches</h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={weightHistory}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis 
                                            dataKey="date" 
                                            tick={{fontSize: 11}}
                                            tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                        />
                                        <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{fontSize: 11}} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="hips" stroke="#ec4899" strokeWidth={3} name="Hanches (cm)" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Poitrine */}
                            <div className="glass-card rounded-3xl p-6 shadow-xl">
                                <h3 className="text-xl font-bold mb-4 text-gray-800">📏 Tour de Poitrine</h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={weightHistory}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis 
                                            dataKey="date" 
                                            tick={{fontSize: 11}}
                                            tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                        />
                                        <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{fontSize: 11}} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="chest" stroke="#f59e0b" strokeWidth={3} name="Poitrine (cm)" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Bras */}
                            <div className="glass-card rounded-3xl p-6 shadow-xl">
                                <h3 className="text-xl font-bold mb-4 text-gray-800">💪 Tour de Bras</h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={weightHistory}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis 
                                            dataKey="date" 
                                            tick={{fontSize: 11}}
                                            tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                        />
                                        <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{fontSize: 11}} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="arm" stroke="#10b981" strokeWidth={3} name="Bras (cm)" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Historique */}
                        <div className="glass-card rounded-3xl p-6 shadow-xl">
                            <h3 className="text-2xl font-bold mb-6 text-gray-800">📋 Historique Complet</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2 border-orange-200">
                                            <th className="text-left py-3 px-2 text-sm font-semibold">Date</th>
                                            <th className="text-center py-3 px-2 text-sm font-semibold">Poids</th>
                                            <th className="text-center py-3 px-2 text-sm font-semibold">Poitrine</th>
                                            <th className="text-center py-3 px-2 text-sm font-semibold">Taille</th>
                                            <th className="text-center py-3 px-2 text-sm font-semibold">Hanches</th>
                                            <th className="text-center py-3 px-2 text-sm font-semibold">Cuisse</th>
                                            <th className="text-center py-3 px-2 text-sm font-semibold">Bras</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...weightHistory].reverse().map((entry, idx) => (
                                            <tr key={idx} className="border-b border-gray-200 hover:bg-orange-50/50">
                                                <td className="py-3 px-2 text-sm font-medium">
                                                    {new Date(entry.date).toLocaleDateString('fr-FR')}
                                                </td>
                                                <td className="py-3 px-2 text-center font-semibold text-orange-600">{entry.weight} kg</td>
                                                <td className="py-3 px-2 text-center">{entry.chest} cm</td>
                                                <td className="py-3 px-2 text-center">{entry.waist} cm</td>
                                                <td className="py-3 px-2 text-center">{entry.hips} cm</td>
                                                <td className="py-3 px-2 text-center">{entry.thigh} cm</td>
                                                <td className="py-3 px-2 text-center">{entry.arm} cm</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* BIORYTHME TAB */}
                {activeTab === 'biorhythm' && (
                    <div className="space-y-6">
                        {/* Saisie du jour */}
                        <div className="glass-card rounded-3xl p-8 shadow-xl">
                            <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent"
                                style={{fontFamily: "'Playfair Display', serif"}}>
                                🌊 Votre État Aujourd'hui
                            </h2>
                            <div className="space-y-6">
                                {[
                                    { label: 'Heures de sommeil', key: 'sleep', max: 12, step: 0.5, unit: 'h', emoji: '😴' },
                                    { label: 'Humeur', key: 'mood', max: 10, step: 1, unit: '/10', emoji: '😊' },
                                    { label: "Niveau d'énergie", key: 'energy', max: 10, step: 1, unit: '/10', emoji: '⚡' },
                                    { label: 'Niveau de stress', key: 'stress', max: 10, step: 1, unit: '/10', emoji: '😰' }
                                ].map((item, idx) => (
                                    <div key={idx}>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-sm font-semibold text-gray-700">
                                                {item.emoji} {item.label}
                                            </label>
                                            <span className="text-2xl font-bold text-teal-600">
                                                {todayBio[item.key]}{item.unit}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max={item.max}
                                            step={item.step}
                                            value={todayBio[item.key]}
                                            onChange={(e) => setTodayBio(prev => ({ ...prev, [item.key]: parseFloat(e.target.value) }))}
                                            className="w-full h-3 bg-gradient-to-r from-teal-200 to-emerald-200 rounded-full appearance-none cursor-pointer"
                                        />
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={saveTodayBiorhythm}
                                className="w-full mt-6 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold rounded-xl hover:shadow-xl transition-all text-lg"
                            >
                                💾 Sauvegarder aujourd'hui (+10 points)
                            </button>
                        </div>

                        {/* Cycles Biorythmiques Scientifiques */}
                        <div className="glass-card rounded-3xl p-8 shadow-xl">
                            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
                                style={{fontFamily: "'Playfair Display', serif"}}>
                                🔮 Vos Cycles Biorythmiques
                            </h2>
                            <p className="text-sm text-gray-600 mb-6">
                                Basé sur votre date de naissance, ces cycles naturels influencent votre état physique, émotionnel et intellectuel.
                            </p>
                            
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                {[
                                    { label: 'Physique', value: biorhythms.physical, color: 'from-red-500 to-orange-500', desc: 'Force, endurance, coordination', cycle: '23 jours' },
                                    { label: 'Émotionnel', value: biorhythms.emotional, color: 'from-pink-500 to-rose-500', desc: 'Humeur, créativité, sensibilité', cycle: '28 jours' },
                                    { label: 'Intellectuel', value: biorhythms.intellectual, color: 'from-blue-500 to-cyan-500', desc: 'Concentration, mémoire, logique', cycle: '33 jours' }
                                ].map((cycle, idx) => (
                                    <div key={idx} className="text-center p-6 bg-gradient-to-br from-white/50 to-white/30 rounded-2xl">
                                        <div className={`text-5xl font-bold mb-2 bg-gradient-to-r ${cycle.color} bg-clip-text text-transparent`}>
                                            {cycle.value}%
                                        </div>
                                        <div className="font-bold text-gray-800 mb-2">{cycle.label}</div>
                                        <div className="text-xs text-gray-600 mb-2">{cycle.desc}</div>
                                        <div className="text-xs text-gray-500">Cycle de {cycle.cycle}</div>
                                        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full bg-gradient-to-r ${cycle.color}`}
                                                style={{width: `${cycle.value}%`}}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Prévisions 7 jours */}
                            <h3 className="text-xl font-bold mb-4 text-gray-800">📅 Prévisions sur 7 jours</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={biorhythmForecast}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="date" tick={{fontSize: 11}} />
                                    <YAxis domain={[0, 100]} tick={{fontSize: 11}} />
                                    <Tooltip 
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: 'none',
                                            borderRadius: '12px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="physical" stroke="#f97316" strokeWidth={2} name="Physique" />
                                    <Line type="monotone" dataKey="emotional" stroke="#ec4899" strokeWidth={2} name="Émotionnel" />
                                    <Line type="monotone" dataKey="intellectual" stroke="#3b82f6" strokeWidth={2} name="Intellectuel" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Historique bien-être */}
                        <div className="glass-card rounded-3xl p-8 shadow-xl">
                            <h3 className="text-2xl font-bold mb-6 text-gray-800">📊 Évolution de votre Bien-être</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={biorhythmHistory}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{fontSize: 11}}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                    />
                                    <YAxis domain={[0, 10]} tick={{fontSize: 11}} />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="sleep" stroke="#8b5cf6" strokeWidth={2} name="Sommeil (h)" />
                                    <Line type="monotone" dataKey="mood" stroke="#ec4899" strokeWidth={2} name="Humeur" />
                                    <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2} name="Énergie" />
                                    <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2} name="Stress" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* RÉCOMPENSES TAB */}
                {activeTab === 'rewards' && (
                    <div className="space-y-6">
                        {/* Niveau & Points Display */}
                        <div className="glass-card rounded-3xl p-8 shadow-xl text-center relative overflow-hidden">
                            {/* Decorative background */}
                            <div className="absolute inset-0 opacity-5">
                                <div className="absolute top-4 left-8 text-8xl">{currentLevel.icon}</div>
                                <div className="absolute bottom-4 right-8 text-8xl">{currentLevel.icon}</div>
                            </div>
                            <div className="relative z-10">
                                <div className="text-6xl mb-2">{currentLevel.icon}</div>
                                <div className={`inline-block px-4 py-1 rounded-full bg-gradient-to-r ${currentLevel.color} text-white text-sm font-bold mb-3 shadow-md`}>
                                    Niveau {currentLevel.level}
                                </div>
                                <div className="text-4xl font-bold mb-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent"
                                     style={{fontFamily: "'Playfair Display', serif"}}>
                                    {currentLevel.name}
                                </div>
                                <div className="text-7xl font-bold my-4 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent"
                                     style={{fontFamily: "'Playfair Display', serif"}}>
                                    {points}
                                </div>
                                <div className="text-lg font-semibold text-gray-600">Points Santé ⭐</div>
                                
                                {nextLevel ? (
                                    <div className="mt-6 max-w-md mx-auto">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-500">{currentLevel.icon} {currentLevel.name}</span>
                                            <span className="text-gray-500">{nextLevel.icon} {nextLevel.name}</span>
                                        </div>
                                        <div className="h-5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                                            <div 
                                                className={`h-full bg-gradient-to-r ${currentLevel.color} transition-all duration-700 rounded-full relative`}
                                                style={{width: `${levelProgress}%`}}
                                            >
                                                <div className="absolute inset-0 bg-white/20 rounded-full" 
                                                     style={{animation: 'shimmer 2s infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'}} />
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-500 mt-2">
                                            Encore <span className="font-bold text-orange-600">{nextLevel.minPts - points}</span> points pour atteindre {nextLevel.name}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 text-lg font-semibold text-amber-600">
                                        ✨ Niveau maximum atteint ! Vous êtes une Déesse ! ✨
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tous les niveaux */}
                        <div className="glass-card rounded-3xl p-8 shadow-xl">
                            <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center"
                                style={{fontFamily: "'Playfair Display', serif"}}>
                                🗺️ Parcours des Niveaux
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {LEVELS.map((lvl) => {
                                    const isReached = points >= lvl.minPts;
                                    const isCurrent = lvl.level === currentLevel.level;
                                    return (
                                        <div key={lvl.level}
                                             className={`relative p-4 rounded-2xl text-center transition-all ${
                                                 isCurrent
                                                     ? `bg-gradient-to-br ${lvl.color} text-white shadow-xl scale-105 ring-4 ring-white/50`
                                                     : isReached
                                                         ? `bg-gradient-to-br ${lvl.color} text-white shadow-md opacity-80`
                                                         : 'bg-gray-100 opacity-40'
                                             }`}>
                                            {isCurrent && (
                                                <div className="absolute -top-2 -right-2 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold shadow-lg animate-bounce">
                                                    ici
                                                </div>
                                            )}
                                            <div className="text-3xl mb-1">{lvl.icon}</div>
                                            <div className="font-bold text-sm">{lvl.name}</div>
                                            <div className={`text-xs mt-1 ${isReached ? 'opacity-80' : 'text-gray-500'}`}>
                                                {lvl.minPts} pts
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Badges Grid */}
                        <div className="glass-card rounded-3xl p-8 shadow-xl">
                            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent text-center"
                                style={{fontFamily: "'Playfair Display', serif"}}>
                                🏆 Collection de Badges
                            </h2>
                            <p className="text-center text-gray-500 text-sm mb-8">
                                {badges.filter(b => b.earned).length}/{badges.length} débloqués — Chaque badge rapporte <span className="font-bold text-orange-600">+50 points</span>
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {badges.map(badge => (
                                    <div
                                        key={badge.id}
                                        className={`relative p-6 rounded-2xl text-center transition-all ${
                                            badge.earned
                                                ? `bg-gradient-to-br ${badge.color} text-white shadow-xl hover:scale-105 cursor-pointer`
                                                : 'bg-gray-100 opacity-40 grayscale'
                                        }`}
                                    >
                                        {badge.earned && (
                                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                                                ✓
                                            </div>
                                        )}
                                        <div className="text-5xl mb-3">{badge.icon}</div>
                                        <div className="font-bold text-lg mb-1">{badge.name}</div>
                                        <div className="text-xs opacity-90">{badge.desc}</div>
                                        {badge.earned && (
                                            <div className="mt-2 text-xs font-bold opacity-80">+50 pts ✓</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Accomplissements */}
                        <div className="glass-card rounded-3xl p-8 shadow-xl">
                            <h3 className="text-2xl font-bold mb-6 text-gray-800">🌟 Vos Accomplissements</h3>
                            <div className="space-y-4">
                                {[
                                    { label: 'Série actuelle', value: `${streak} jours`, icon: '🔥', progress: (streak / 30) * 100 },
                                    { label: 'Mesures enregistrées', value: `${weightHistory.length} fois`, icon: '📏', progress: (weightHistory.length / 50) * 100 },
                                    { label: 'Poids perdu', value: `${Math.abs(weightChange)} kg`, icon: '⚖️', progress: (Math.abs(weightChange) / 10) * 100 },
                                    { label: 'Biorythmes suivis', value: `${biorhythmHistory.length} jours`, icon: '🌊', progress: (biorhythmHistory.length / 30) * 100 },
                                    { label: 'Badges débloqués', value: `${badges.filter(b => b.earned).length}/${badges.length}`, icon: '🏅', progress: (badges.filter(b => b.earned).length / badges.length) * 100 }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4">
                                        <div className="text-4xl">{item.icon}</div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-2">
                                                <span className="font-semibold text-gray-700">{item.label}</span>
                                                <span className="font-bold text-orange-600">{item.value}</span>
                                            </div>
                                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-orange-400 to-rose-500 transition-all duration-500"
                                                    style={{width: `${Math.min(item.progress, 100)}%`}}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tableau des points */}
                        <div className="glass-card rounded-3xl p-8 shadow-xl">
                            <h3 className="text-2xl font-bold mb-6 text-gray-800">💰 Comment gagner des points ?</h3>
                            <div className="overflow-hidden rounded-2xl border border-gray-200">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-orange-50 to-rose-50">
                                            <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Action</th>
                                            <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Points</th>
                                            <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm hidden md:table-cell">Fréquence</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {POINTS_TABLE.map((row, idx) => (
                                            <tr key={idx} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-orange-50/50 transition-colors`}>
                                                <td className="py-3 px-4 text-sm">
                                                    <span className="mr-2">{row.icon}</span>
                                                    {row.action}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full text-sm">{row.pts}</span>
                                                </td>
                                                <td className="py-3 px-4 text-right text-xs text-gray-500 hidden md:table-cell">{row.freq}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

                {/* Sponsor Banner */}
                <div className="mt-12 mb-4">
                    <a 
                        href="https://stupeflix.tv" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block group"
                    >
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white/80 via-white/90 to-white/80 backdrop-blur-sm border border-orange-100/50 px-6 py-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-orange-200">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-rose-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative flex items-center justify-center gap-3 flex-wrap">
                                <span className="text-sm text-gray-400">L'utilisation de cette app vous est offerte par notre partenaire</span>
                                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-500 text-base group-hover:from-orange-600 group-hover:to-rose-600 transition-all">
                                    Stupeflix.tv
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-100 to-rose-100 text-orange-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    Découvrir →
                                </span>
                            </div>
                        </div>
                    </a>
                </div>

                {/* Footer */}
                <footer className="text-center py-6 mt-2">
                    <p className="text-sm text-gray-400">
                        Développé par <span className="font-semibold text-gray-500">Gabriel Miquet</span>
                        <span className="mx-2">·</span>
                        <button
                            onClick={() => {
                                const a = 'gmgbxgames';
                                const b = 'gmail.com';
                                window.location.href = 'mai' + 'lto:' + a + '@' + b;
                            }}
                            className="text-orange-400 hover:text-orange-600 font-medium transition-colors cursor-pointer underline underline-offset-2 decoration-orange-200 hover:decoration-orange-400"
                        >
                            Le contacter
                        </button>
                    </p>
                    <p className="text-xs text-gray-300 mt-1">© {new Date().getFullYear()} VitaTrack</p>
                </footer>
        </div>
    );
}
