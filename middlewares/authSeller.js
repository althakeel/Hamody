import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Store from '@/models/Store';
import StoreUser from '@/models/StoreUser';

const authSeller = async (userId, emailFromToken = '') => {
    try {
        if (!userId) {
            console.log('[authSeller] No userId provided');
            return false;
        }
        await connectDB();
        
        const ownedStore = await Store.findOne({ userId: userId }).lean();
        const ownedUsable = Boolean(ownedStore && ownedStore.status !== 'rejected');
        const ownedApproved = ownedStore?.status === 'approved';

        // Team access is checked before a personal store. A second dashboard
        // email often also has its own unfinished store record, and saving
        // there never shows on the live shop.
        let teamMembership = await StoreUser.findOne({
            userId: userId,
            status: { $in: ['approved', 'pending', 'invited'] }
        }).sort({ updatedAt: -1 }).lean();

        // Fallback: match by email if userId wasn't linked yet.
        // Google sign-in on the warehouse app often has no Mongo User row yet,
        // so use the Firebase token email as well as User.email.
        if (!teamMembership) {
            const userProfile = await User.findById(userId).select('email').lean();
            const userEmail = String(emailFromToken || userProfile?.email || '')
                .trim()
                .toLowerCase();
            if (userEmail) {
                teamMembership = await StoreUser.findOne({
                    email: userEmail,
                    status: { $in: ['invited', 'pending', 'approved'] }
                }).sort({ updatedAt: -1 }).lean();

                if (teamMembership && String(teamMembership.userId || '') !== String(userId)) {
                    await StoreUser.findByIdAndUpdate(teamMembership._id, {
                        userId: userId,
                        status: 'approved'
                    });
                    console.log('[authSeller] Linked team membership by email');
                }
            }
        }

        let teamStore = null;
        if (teamMembership?.storeId) {
            const store = await Store.findById(teamMembership.storeId).lean();
            if (store && store.status !== 'rejected') teamStore = store;
        }

        if (teamStore && !ownedApproved) {
            console.log('[authSeller] Using invited store');
            return teamStore._id.toString();
        }

        if (ownedUsable) {
            console.log('[authSeller] Using owned store');
            return ownedStore._id.toString();
        }

        if (teamStore) {
            console.log('[authSeller] Using invited store');
            return teamStore._id.toString();
        }

        console.log('[authSeller] User has no seller access');
        return false;
    } catch (error) {
        console.log('[authSeller] Error:', error);
        return false;
    }
}

export default authSeller