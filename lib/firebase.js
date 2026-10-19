import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, serverTimestamp, query, where, getDocs, updateDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCjrCgQWdhjOVvERnBRJFVarH7UZ7gMBrA",
    authDomain: "palm-village-project.firebaseapp.com",
    projectId: "palm-village-project",
    storageBucket: "palm-village-project.firebasestorage.app",
    messagingSenderId: "795822802972",
    appId: "1:795822802972:web:88a85865cfe04c211937d9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const saveBookingToFirebase = async (bookingData, userData) => {
    try {
        const userRef = doc(db, "users", userData.nic);
        await setDoc(userRef, {
            ...userData,
            lastUpdated: serverTimestamp()
        }, { merge: true });

        const docRef = await addDoc(collection(db, "bookings"), {
            ...bookingData,
            userId: userData.nic,
            createdAt: serverTimestamp(),
            status: 'confirmed'
        });
        return true;
    } catch (e) {
        console.error("Error adding document: ", e);
        return false;
    }
};

export const fetchDailyReportFromFirebase = async (dateStr) => {
    try {
        const q = query(collection(db, "bookings"), where("bookingDate", "==", dateStr));
        const querySnapshot = await getDocs(q);
        let bookings = [];
        let totalIncome = 0;
        querySnapshot.forEach((docSnap) => {
            let data = docSnap.data();
            data.docId = docSnap.id;
            bookings.push(data);
            totalIncome += data.financials.totalPaid;
        });
        return { bookings, totalIncome };
    } catch (e) {
        console.error("Error fetching report:", e);
        return { bookings: [], totalIncome: 0 };
    }
};

export const markBookingUtilized = async (docId) => {
    try {
        const bookingRef = doc(db, "bookings", docId);
        await updateDoc(bookingRef, {
            status: 'utilized'
        });
        return true;
    } catch (e) {
        console.error("Error updating status:", e);
        return false;
    }
};

export const cancelBookingInFirebase = async (docId) => {
    try {
        await deleteDoc(doc(db, "bookings", docId));
        return true;
    } catch (e) {
        console.error("Error canceling booking:", e);
        return false;
    }
};

export const fetchActiveBookingsFromFirebase = async () => {
    try {
        const q = query(collection(db, "bookings"), where("status", "==", "active"));
        const querySnapshot = await getDocs(q);
        let activeBookings = [];
        querySnapshot.forEach((docSnap) => {
            let data = docSnap.data();
            data.docId = docSnap.id;
            activeBookings.push(data);
        });
        return activeBookings;
    } catch (e) {
        console.error("Error fetching active bookings:", e);
        return [];
    }
}

export const startBookingSession = async (docId) => {
    try {
        const bookingRef = doc(db, "bookings", docId);
        await updateDoc(bookingRef, {
            status: 'active',
            checkInTime: Date.now()
        });
        return true;
    } catch (e) {
        console.error("Error activating booking:", e);
        return false;
    }
}

export const extendBookingSession = async (docId, extraMinutes) => {
    try {
        const bookingRef = doc(db, "bookings", docId);
        return true;
    } catch(e) {
        return false;
    }
}

export const verifyAdminPassword = async (inputPwd) => {
    try {
        const docRef = doc(db, "admin", "settings");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data().password === inputPwd;
        } else {
            if (inputPwd === "admin123") {
                await setDoc(docRef, { password: "admin123" });
                return true;
            }
            return false;
        }
    } catch (e) {
        console.error("Auth error:", e);
        return inputPwd === "admin123";
    }
};

export const changeAdminPassword = async (newPwd) => {
    try {
        const docRef = doc(db, "admin", "settings");
        await setDoc(docRef, { password: newPwd }, { merge: true });
        return true;
    } catch(e) {
        console.error("Update error:", e);
        return false;
    }
};

export { db };