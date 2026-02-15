import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export function useUserData(user) {
    const [userData, setUserData] = useState({
        name: '',
        age: 30,
        gender: 'female',
        height: 165,
        activityLevel: 1.55,
        goal: 'maintain',
        birthDate: '1994-02-06'
    });

    const [weightHistory, setWeightHistory] = useState([]);
    const [biorhythmHistory, setBiorhythmHistory] = useState([]);
    const [points, setPoints] = useState(0);
    const [streak, setStreak] = useState(0);
    const [loading, setLoading] = useState(true);
    const [awardedBadgeCount, setAwardedBadgeCount] = useState(0);

    useEffect(() => {
        if (user) {
            loadUserData();
        }
    }, [user]);

    const loadUserData = async () => {
        try {
            // Charger le profil
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile) {
                setUserData({
                    name: profile.name || '',
                    age: profile.age || 30,
                    gender: profile.gender || 'female',
                    height: profile.height || 165,
                    activityLevel: profile.activity_level || 1.55,
                    goal: profile.goal || 'maintain',
                    birthDate: profile.birth_date || '1994-02-06'
                });
            }

            // Charger les mensurations
            const { data: measurements } = await supabase
                .from('measurements')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: true });

            if (measurements && measurements.length > 0) {
                setWeightHistory(measurements.map(m => ({
                    date: m.date,
                    weight: parseFloat(m.weight),
                    chest: parseFloat(m.chest),
                    waist: parseFloat(m.waist),
                    hips: parseFloat(m.hips),
                    thigh: parseFloat(m.thigh),
                    arm: parseFloat(m.arm)
                })));
            }

            // Charger les biorythmes
            const { data: biorhythms } = await supabase
                .from('biorhythm_entries')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: true });

            if (biorhythms && biorhythms.length > 0) {
                setBiorhythmHistory(biorhythms.map(b => ({
                    date: b.date,
                    sleep: parseFloat(b.sleep),
                    mood: parseInt(b.mood),
                    energy: parseInt(b.energy),
                    stress: parseInt(b.stress),
                    physical: parseInt(b.physical),
                    emotional: parseInt(b.emotional),
                    intellectual: parseInt(b.intellectual)
                })));
            }

            // Charger les stats (points et série)
            const { data: stats } = await supabase
                .from('user_stats')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (stats) {
                setPoints(stats.points || 0);
                setStreak(stats.streak || 0);
                setAwardedBadgeCount(stats.badges_awarded_count || 0);
            }

        } catch (error) {
            console.error('Erreur chargement données:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveProfile = async (newData) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    name: newData.name,
                    age: newData.age,
                    gender: newData.gender,
                    height: newData.height,
                    activity_level: newData.activityLevel,
                    goal: newData.goal,
                    birth_date: newData.birthDate,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            setUserData(newData);
            return true;
        } catch (error) {
            console.error('Erreur sauvegarde profil:', error);
            return false;
        }
    };

    const addMeasurement = async (measurement) => {
        try {
            const newEntry = {
                user_id: user.id,
                date: new Date().toISOString().split('T')[0],
                weight: measurement.weight,
                chest: measurement.chest,
                waist: measurement.waist,
                hips: measurement.hips,
                thigh: measurement.thigh,
                arm: measurement.arm
            };

            const { error } = await supabase
                .from('measurements')
                .upsert(newEntry, { onConflict: 'user_id,date' });

            if (error) throw error;

            // Mettre à jour l'état local
            const existingIndex = weightHistory.findIndex(w => w.date === newEntry.date);
            if (existingIndex >= 0) {
                const updated = [...weightHistory];
                updated[existingIndex] = newEntry;
                setWeightHistory(updated);
            } else {
                setWeightHistory([...weightHistory, newEntry]);
            }

            // Ajouter des points
            await addPoints(15);

            return true;
        } catch (error) {
            console.error('Erreur ajout mesure:', error);
            return false;
        }
    };

    const saveBiorhythm = async (bioData) => {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Calculer les biorythmes
            const birthDate = new Date(userData.birthDate);
            const todayDate = new Date();
            const daysSinceBirth = Math.floor((todayDate - birthDate) / (1000 * 60 * 60 * 24));
            
            const physical = Math.round(Math.sin((2 * Math.PI * daysSinceBirth) / 23) * 50 + 50);
            const emotional = Math.round(Math.sin((2 * Math.PI * daysSinceBirth) / 28) * 50 + 50);
            const intellectual = Math.round(Math.sin((2 * Math.PI * daysSinceBirth) / 33) * 50 + 50);

            const newEntry = {
                user_id: user.id,
                date: today,
                sleep: bioData.sleep,
                mood: bioData.mood,
                energy: bioData.energy,
                stress: bioData.stress,
                physical: physical,
                emotional: emotional,
                intellectual: intellectual
            };

            const { error } = await supabase
                .from('biorhythm_entries')
                .upsert(newEntry, { onConflict: 'user_id,date' });

            if (error) throw error;

            // Mettre à jour l'état local
            const existingIndex = biorhythmHistory.findIndex(b => b.date === today);
            if (existingIndex >= 0) {
                const updated = [...biorhythmHistory];
                updated[existingIndex] = newEntry;
                setBiorhythmHistory(updated);
            } else {
                setBiorhythmHistory([...biorhythmHistory, newEntry]);
            }

            // Mettre à jour la série et ajouter des points
            await updateStreak();
            await addPoints(10);

            return true;
        } catch (error) {
            console.error('Erreur sauvegarde biorythme:', error);
            return false;
        }
    };

    const addPoints = async (pointsToAdd) => {
        try {
            const newPoints = points + pointsToAdd;
            
            const { error } = await supabase
                .from('user_stats')
                .upsert({
                    user_id: user.id,
                    points: newPoints,
                    streak: streak,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;
            setPoints(newPoints);
        } catch (error) {
            console.error('Erreur ajout points:', error);
        }
    };

    const updateStreak = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Vérifier si on a déjà mis à jour le streak aujourd'hui
            const { data: currentStats } = await supabase
                .from('user_stats')
                .select('last_entry_date, streak')
                .eq('user_id', user.id)
                .single();

            // Si on a déjà enregistré aujourd'hui, ne pas ré-incrémenter
            if (currentStats && currentStats.last_entry_date === today) {
                return;
            }

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            // Vérifier si on a une entrée hier
            const { data: yesterdayEntry } = await supabase
                .from('biorhythm_entries')
                .select('date')
                .eq('user_id', user.id)
                .eq('date', yesterdayStr)
                .single();

            let newStreak = 1;
            const currentStreak = currentStats?.streak || 0;
            
            if (yesterdayEntry) {
                // Continuer la série
                newStreak = currentStreak + 1;
            }

            // Bonus de points pour les paliers de streak
            const STREAK_BONUSES = [
                { days: 7, bonus: 25 },
                { days: 14, bonus: 50 },
                { days: 30, bonus: 100 },
                { days: 90, bonus: 250 },
                { days: 365, bonus: 1000 }
            ];

            let streakBonus = 0;
            for (const sb of STREAK_BONUSES) {
                if (newStreak === sb.days) {
                    streakBonus = sb.bonus;
                    break;
                }
            }

            const updatedPoints = points + streakBonus;

            const { error } = await supabase
                .from('user_stats')
                .upsert({
                    user_id: user.id,
                    points: updatedPoints,
                    streak: newStreak,
                    last_entry_date: today,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;
            if (streakBonus > 0) setPoints(updatedPoints);
            setStreak(newStreak);
        } catch (error) {
            console.error('Erreur mise à jour série:', error);
        }
    };

    // Vérifier et attribuer les bonus de badges
    const awardBadgeBonuses = async (earnedBadgeCount) => {
        try {
            if (earnedBadgeCount <= awardedBadgeCount) return; // Pas de nouveaux badges

            const newBadges = earnedBadgeCount - awardedBadgeCount;
            const bonusPoints = newBadges * 50;
            const newPoints = points + bonusPoints;

            const { error } = await supabase
                .from('user_stats')
                .upsert({
                    user_id: user.id,
                    points: newPoints,
                    streak: streak,
                    badges_awarded_count: earnedBadgeCount,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;
            setPoints(newPoints);
            setAwardedBadgeCount(earnedBadgeCount);
        } catch (error) {
            console.error('Erreur bonus badges:', error);
        }
    };

    return {
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
        loading,
        saveProfile,
        addMeasurement,
        saveBiorhythm,
        awardBadgeBonuses
    };
}
