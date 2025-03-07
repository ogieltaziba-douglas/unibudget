import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { auth } from "../util/firebase";

export const AuthContext = createContext({
  token: "",
  uid: "",
  displayName: "",
  isAuthenticated: false,
  loading: true,
  authenticate: (token, uid, displayName) => {},
  logout: () => {},
});

function AuthContextProvider({ children }) {
  const [authToken, setAuthToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userDisplayName, setUserDisplayName] = useState("");  
  const [loading, setLoading] = useState(true);  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User is authenticated with UID:", user.uid);
        setAuthToken(user.accessToken); 
        setUserId(user.uid);
        setUserDisplayName(user.displayName || "");  
        AsyncStorage.setItem("token", user.accessToken); 
        AsyncStorage.setItem("uid", user.uid); 
        AsyncStorage.setItem("displayName", user.displayName || "");  
      } else {
        console.log("User is not authenticated");
        setAuthToken(null);
        setUserId(null);
        setUserDisplayName(""); 
      }
      setLoading(false);  
    });

    return () => unsubscribe(); 
  }, []);

  const authenticate = (token, uid, displayName) => {
    console.log("Setting token, UID, and displayName in AuthContext:", token, uid, displayName);
    setAuthToken(token);
    setUserId(uid);
    setUserDisplayName(displayName);
    AsyncStorage.setItem("token", token); 
    AsyncStorage.setItem("uid", uid);
    AsyncStorage.setItem("displayName", displayName);  
  };

  const logout = () => {
    setAuthToken(null);
    setUserId(null);
    setUserDisplayName(""); 
    AsyncStorage.removeItem("token");
    AsyncStorage.removeItem("uid");
    AsyncStorage.removeItem("displayName"); 
  };

  const value = {
    token: authToken,
    uid: userId,
    displayName: userDisplayName,  
    isAuthenticated: !!authToken,
    loading,
    authenticate,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContextProvider;



