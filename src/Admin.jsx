import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function Admin({ user, onLogout }) {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        totalMeasurements: 0,
        totalBiorhythms: 0,
        maleUsers: 0,
        femaleUsers: 0,
        ageGroups: {
            '18-25': 0,
            '26-35': 0,
            '36-45': 0,
            '46-55': 0,
            '56+': 0
        }
    });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showAddUser, setShowAddUser] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        name: '',
        age: 30,
        gender: 'female',
        height: 165,
        goal: 'maintain'
    });

    useEffect(() => {
        loadAdminData();
    }, []);

    const loadAdminData = async () => {
        setLoading(true);
        try {
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            const { data: statsData } = await supabase
                .from('user_stats')
                .select('*');

            const { count: measurementCount } = await supabase
                .from('measurements')
                .select('*', { count: 'exact', head: true });

            const { count: bioCount } = await supabase
                .from('biorhythm_entries')
                .select('*', { count: 'exact', head: true });

            if (profilesData) {
                const profilesWithStats = profilesData.map(profile => ({
                    ...profile,
                    user_stats: statsData ? statsData.filter(s => s.user_id === profile.id) : []
                }));

                setUsers(profilesWithStats);

                const maleCount = profilesWithStats.filter(p => p.gender === 'male').length;
                const femaleCount = profilesWithStats.filter(p => p.gender === 'female').length;
                const activeCount = profilesWithStats.filter(p => {
                    const userStats = p.user_stats?.[0];
                    return userStats && userStats.streak > 0;
                }).length;

                const ageGroups = {
                    '18-25': 0,
                    '26-35': 0,
                    '36-45': 0,
                    '46-55': 0,
                    '56+': 0
                };

                profilesWithStats.forEach(p => {
                    const age = p.age;
                    if (age >= 18 && age <= 25) ageGroups['18-25']++;
                    else if (age >= 26 && age <= 35) ageGroups['26-35']++;
                    else if (age >= 36 && age <= 45) ageGroups['36-45']++;
                    else if (age >= 46 && age <= 55) ageGroups['46-55']++;
                    else if (age >= 56) ageGroups['56+']++;
                });

                setStats({
                    totalUsers: profilesWithStats.length,
                    activeUsers: activeCount,
                    totalMeasurements: measurementCount || 0,
                    totalBiorhythms: bioCount || 0,
                    maleUsers: maleCount,
                    femaleUsers: femaleCount,
                    ageGroups: ageGroups
                });
            }
        } catch (error) {
            console.error('Erreur chargement admin:', error);
        } finally {
            setLoading(false);
        }
    };

    const createUser = async (e) => {
        e.preventDefault();
        try {
            const { data: authData, error: authError} = await supabase.auth.admin.createUser({
                email: newUser.email,
                password: newUser.password,
                email_confirm: true,
                user_metadata: { name: newUser.name }
            });
            if (authError) throw authError;

            await supabase.from('profiles').insert({
                id: authData.user.id,
                name: newUser.name,
                age: newUser.age,
                gender: newUser.gender,
                height: newUser.height,
                goal: newUser.goal
            });

            await supabase.from('user_stats').insert({
                user_id: authData.user.id,
                points: 0,
                streak: 0
            });

            alert('✅ Utilisateur créé !');
            setShowAddUser(false);
            setNewUser({ email: '', password: '', name: '', age: 30, gender: 'female', height: 165, goal: 'maintain' });
            loadAdminData();
        } catch (error) {
            alert('❌ Erreur: ' + error.message);
        }
    };

    const updateUser = async () => {
        if (!selectedUser) return;
        try {
            await supabase.from('profiles').update({
                name: selectedUser.name,
                age: selectedUser.age,
                gender: selectedUser.gender,
                height: selectedUser.height,
                goal: selectedUser.goal,
                updated_at: new Date().toISOString()
            }).eq('id', selectedUser.id);

            alert('✅ Utilisateur mis à jour !');
            setSelectedUser(null);
            loadAdminData();
        } catch (error) {
            alert('❌ Erreur: ' + error.message);
        }
    };

    const deleteUser = async (userId) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur et toutes ses données ?')) return;

        try {
            // 1. Supprimer les mesures
            const { error: measurementsError } = await supabase
                .from('measurements')
                .delete()
                .eq('user_id', userId);
            
            if (measurementsError) {
                console.error('Erreur mesures:', measurementsError);
                throw new Error('Erreur suppression mesures: ' + measurementsError.message);
            }

            // 2. Supprimer les biorythmes
            const { error: bioError } = await supabase
                .from('biorhythm_entries')
                .delete()
                .eq('user_id', userId);
            
            if (bioError) {
                console.error('Erreur biorythmes:', bioError);
                throw new Error('Erreur suppression biorythmes: ' + bioError.message);
            }

            // 3. Supprimer les stats
            const { error: statsError } = await supabase
                .from('user_stats')
                .delete()
                .eq('user_id', userId);
            
            if (statsError) {
                console.error('Erreur stats:', statsError);
                throw new Error('Erreur suppression stats: ' + statsError.message);
            }

            // 4. Supprimer le profil (en dernier)
            const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);
            
            if (profileError) {
                console.error('Erreur profil:', profileError);
                throw new Error('Erreur suppression profil: ' + profileError.message);
            }

            alert('✅ Utilisateur et toutes ses données supprimés avec succès');
            loadAdminData();
        } catch (error) {
            console.error('Erreur suppression:', error);
            alert('❌ Erreur lors de la suppression: ' + error.message);
        }
    };

    const exportToCSV = () => {
        const filteredUsers = users.filter(u => {
            const createdDate = new Date(u.created_at).toISOString().split('T')[0];
            return createdDate >= dateRange.start && createdDate <= dateRange.end;
        });

        const headers = ['Nom', 'Âge', 'Sexe', 'Taille', 'Objectif', 'Points', 'Série', 'Inscription'];
        const rows = filteredUsers.map(u => [
            u.name || '',
            u.age || '',
            u.gender === 'male' ? 'Homme' : 'Femme',
            u.height || '',
            u.goal === 'loss' ? 'Perte' : u.goal === 'gain' ? 'Gain' : 'Maintien',
            u.user_stats?.[0]?.points || 0,
            u.user_stats?.[0]?.streak || 0,
            new Date(u.created_at).toLocaleDateString('fr-FR')
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `vitatrack_users_${dateRange.start}_${dateRange.end}.csv`;
        link.click();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 flex items-center justify-center">
                <div className="text-2xl text-orange-600">Chargement...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent" style={{fontFamily: "'Playfair Display', serif"}}>🔧 Admin Dashboard</h1>
                        <p className="text-gray-600 mt-2">Connecté : {user?.email}</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowAddUser(true)} className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl">+ Utilisateur</button>
                        <button onClick={onLogout} className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-xl">Déconnexion</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'Utilisateurs Total', value: stats.totalUsers, icon: '👥', color: 'from-blue-400 to-cyan-400' },
                        { label: 'Utilisateurs Actifs', value: stats.activeUsers, icon: '🔥', color: 'from-orange-400 to-red-400' },
                        { label: 'Mesures', value: stats.totalMeasurements, icon: '📏', color: 'from-purple-400 to-pink-400' },
                        { label: 'Biorythmes', value: stats.totalBiorhythms, icon: '🌊', color: 'from-teal-400 to-emerald-400' }
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white/90 rounded-3xl p-6 shadow-xl">
                            <div className="text-4xl mb-2">{stat.icon}</div>
                            <div className="text-sm font-semibold text-gray-600">{stat.label}</div>
                            <div className={`text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} style={{fontFamily: "'Playfair Display', serif"}}>{stat.value}</div>
                        </div>
                    ))}
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white/90 rounded-3xl p-6 shadow-xl">
                        <h3 className="text-xl font-bold mb-4">👥 Par Genre</h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span>Hommes</span>
                                    <span className="font-bold text-blue-600">{stats.maleUsers}</span>
                                </div>
                                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600" style={{width: `${stats.totalUsers > 0 ? (stats.maleUsers / stats.totalUsers) * 100 : 0}%`}}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span>Femmes</span>
                                    <span className="font-bold text-pink-600">{stats.femaleUsers}</span>
                                </div>
                                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-pink-400 to-pink-600" style={{width: `${stats.totalUsers > 0 ? (stats.femaleUsers / stats.totalUsers) * 100 : 0}%`}}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/90 rounded-3xl p-6 shadow-xl">
                        <h3 className="text-xl font-bold mb-4">📊 Tranches d'Âge</h3>
                        <div className="space-y-2">
                            {Object.entries(stats.ageGroups).map(([range, count]) => (
                                <div key={range} className="flex justify-between">
                                    <span className="text-sm font-medium">{range} ans</span>
                                    <span className="font-bold text-orange-600">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white/90 rounded-3xl p-6 shadow-xl mb-8">
                    <h3 className="text-xl font-bold mb-4">📥 Export CSV</h3>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-semibold mb-2">Début</label>
                            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="w-full px-4 py-2 rounded-xl border-2 border-orange-200" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-semibold mb-2">Fin</label>
                            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="w-full px-4 py-2 rounded-xl border-2 border-orange-200" />
                        </div>
                        <button onClick={exportToCSV} className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl">📥 CSV</button>
                    </div>
                </div>

                <div className="bg-white/90 rounded-3xl p-6 shadow-xl">
                    <h2 className="text-2xl font-bold mb-6">📋 Utilisateurs ({users.length})</h2>
                    {users.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">Aucun utilisateur</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-orange-200">
                                        <th className="text-left py-3 px-4 text-sm font-semibold">Nom</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold">Âge</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold">Sexe</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold">Objectif</th>
                                        <th className="text-center py-3 px-4 text-sm font-semibold">Points</th>
                                        <th className="text-center py-3 px-4 text-sm font-semibold">Série</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold">Inscription</th>
                                        <th className="text-center py-3 px-4 text-sm font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u, idx) => (
                                        <tr key={idx} className="border-b hover:bg-orange-50/50">
                                            <td className="py-3 px-4 font-medium">{u.name || 'Sans nom'}</td>
                                            <td className="py-3 px-4">{u.age || '-'}</td>
                                            <td className="py-3 px-4">{u.gender === 'male' ? '👨 Homme' : '👩 Femme'}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${u.goal === 'loss' ? 'bg-green-100 text-green-700' : u.goal === 'gain' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {u.goal === 'loss' ? 'Perte' : u.goal === 'gain' ? 'Gain' : 'Maintien'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center font-bold text-orange-600">{u.user_stats?.[0]?.points || 0}</td>
                                            <td className="py-3 px-4 text-center font-bold text-teal-600">{u.user_stats?.[0]?.streak || 0} 🔥</td>
                                            <td className="py-3 px-4 text-sm">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                                            <td className="py-3 px-4 text-center">
                                                <button onClick={() => setSelectedUser(u)} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm mr-2">Modifier</button>
                                                <button onClick={() => deleteUser(u.id)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm">Supprimer</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {showAddUser && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowAddUser(false)}>
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-2xl font-bold mb-6">Nouvel Utilisateur</h3>
                            <form onSubmit={createUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Email</label>
                                    <input type="email" required value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full px-4 py-2 rounded-xl border-2 border-orange-200" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Mot de passe</label>
                                    <input type="password" required minLength={6} value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full px-4 py-2 rounded-xl border-2 border-orange-200" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Nom</label>
                                    <input type="text" required value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className="w-full px-4 py-2 rounded-xl border-2 border-orange-200" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Âge</label>
                                        <input type="number" value={newUser.age} onChange={(e) => setNewUser({...newUser, age: parseInt(e.target.value)})} className="w-full px-4 py-2 rounded-xl border-2 border-orange-200" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Taille</label>
                                        <input type="number" value={newUser.height} onChange={(e) => setNewUser({...newUser, height: parseInt(e.target.value)})} className="w-full px-4 py-2 rounded-xl border-2 border-orange-200" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Sexe</label>
                                    <select value={newUser.gender} onChange={(e) => setNewUser({...newUser, gender: e.target.value})} className="w-full px-4 py-2 rounded-xl border-2 border-orange-200">
                                        <option value="male">Homme</option>
                                        <option value="female">Femme</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Objectif</label>
                                    <select value={newUser.goal} onChange={(e) => setNewUser({...newUser, goal: e.target.value})} className="w-full px-4 py-2 rounded-xl border-2 border-orange-200">
                                        <option value="loss">Perte</option>
                                        <option value="maintain">Maintien</option>
                                        <option value="gain">Gain</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl">Créer</button>
                                    <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl">Annuler</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {selectedUser && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedUser(null)}>
                        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-2xl font-bold mb-6">Modifier {selectedUser.name}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Nom</label>
                                    <input type="text" value={selectedUser.name || ''} onChange={(e) => setSelectedUser({...selectedUser, name: e.target.value})} className="w-full px-4 py-2 rounded-xl border-2 border-orange-200" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Âge</label>
                                        <input type="number" value={selectedUser.age || ''} onChange={(e) => setSelectedUser({...selectedUser, age: parseInt(e.target.value)})} className="w-full px-4 py-2 rounded-xl border-2 border-orange-200" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Taille</label>
                                        <input type="number" value={selectedUser.height || ''} onChange={(e) => setSelectedUser({...selectedUser, height: parseInt(e.target.value)})} className="w-full px-4 py-2 rounded-xl border-2 border-orange-200" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Sexe</label>
                                    <select value={selectedUser.gender} onChange={(e) => setSelectedUser({...selectedUser, gender: e.target.value})} className="w-full px-4 py-2 rounded-xl border-2 border-orange-200">
                                        <option value="male">Homme</option>
                                        <option value="female">Femme</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Objectif</label>
                                    <select value={selectedUser.goal} onChange={(e) => setSelectedUser({...selectedUser, goal: e.target.value})} className="w-full px-4 py-2 rounded-xl border-2 border-orange-200">
                                        <option value="loss">Perte</option>
                                        <option value="maintain">Maintien</option>
                                        <option value="gain">Gain</option>
                                    </select>
                                </div>
                                <div className="pt-4 border-t">
                                    <p className="text-sm font-semibold mb-1">Statistiques</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500">Points</p>
                                            <p className="text-lg font-bold text-orange-600">{selectedUser.user_stats?.[0]?.points || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Série</p>
                                            <p className="text-lg font-bold text-teal-600">{selectedUser.user_stats?.[0]?.streak || 0} jours</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={updateUser} className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl">Sauvegarder</button>
                                    <button onClick={() => setSelectedUser(null)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl">Annuler</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
