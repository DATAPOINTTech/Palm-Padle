const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, deleteDoc, doc } = require("firebase/firestore");

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

async function clearBookings() {
    console.log("Fetching bookings...");
    const querySnapshot = await getDocs(collection(db, "bookings"));
    let count = 0;
    for (const document of querySnapshot.docs) {
        await deleteDoc(doc(db, "bookings", document.id));
        count++;
    }
    console.log(`Successfully deleted ${count} bookings.`);
    process.exit(0);
}

clearBookings();