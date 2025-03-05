import axios from "axios";
import { getFirestore, collection, getDocs, addDoc, doc, deleteDoc,setDoc,updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../util/firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const API_KEY = "AIzaSyCRmRU2DEamakBQ0XPbBP5wpCSic3gf1X8";

async function authenticate(mode, email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:${mode}?key=${API_KEY}`;

  const response = await axios.post(url, {
    email: email,
    password: password,
    returnSecureToken: true,
  });

  const token = response.data.idToken;
  const uid = response.data.localId; 

  console.log("Authentication successful. Token:", token, "UID:", uid);

  return { token, uid };
}

// Create a new user and initialize their Firestore document
export async function createUser(email, password, name) {
  try {
    const { token, uid } = await authenticate("signUp", email, password);
    console.log("Authenticated with UID:", uid);

    // Ensure user data is written to Firestore after authentication is successful
    if (uid) {
      await createUserInFirestore(uid, email, name); 
    } else {
      console.error("UID is undefined or null.");
    }

    return { token, uid }; 
  } catch (error) {
    console.error("Error during user creation: ", error);
  }
}

// Log in an existing user
export async function login(email, password) {
  try {
    const { token, uid } = await authenticate("signInWithPassword", email, password);
    console.log("Authenticated with UID:", uid);

    if (uid) {
      await updateUserLastLogin(uid);
    }

    return { token, uid }; 
  } catch (error) {
    console.error("Error during login: ", error);
  }
}

// Save user data to Firestore during signup
export async function createUserInFirestore(uid, email, name) {
  const userRef = doc(db, "users", uid); 
  try {
    await setDoc(userRef, {
      email: email,
      name: name,
      balance: 0, 
      transactions: [], 
      createdAt: serverTimestamp(),
      last_login: serverTimestamp(),
    });
    console.log("User document created successfully in Firestore!");
  } catch (error) {
    console.error("Error saving user data to Firestore: ", error.code, error.message);
  }
}

// Update user's last login timestamp
export async function updateUserLastLogin(uid) {
  const userRef = doc(db, "users", uid); 
  try {
    await updateDoc(userRef, {
      last_login: serverTimestamp(),
    });
    console.log("Last login timestamp updated successfully.");
  } catch (error) {
    console.error("Error updating last login in Firestore: ", error);
  }
}

// Listening for changes in authentication state
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User is authenticated with UID:", user.uid);
  } else {
    console.log("User is not authenticated");
  }
});

