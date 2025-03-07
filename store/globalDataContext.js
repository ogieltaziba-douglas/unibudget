import { createContext, useState, useContext, useEffect } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../util/firebase";
import { AuthContext } from "./auth-context";

export const GlobalDataContext = createContext();

export const GlobalDataProvider = ({ children }) => {
  const [budgets, setBudgets] = useState([]);
  const [userBalance, setUserBalance] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true); // Loading state for data fetching

  const { uid } = useContext(AuthContext); // Get the user UID from the auth context

  useEffect(() => {
    if (!uid) {
      console.log("No UID available, waiting for it...");
      return;
    }

    setLoading(true); // Set loading to true until the data is fetched

    // Fetch budgets
    const unsubscribeBudgets = onSnapshot(
      collection(db, "users", uid, "budgets"),
      (snapshot) => {
        const newBudgets = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setBudgets(newBudgets); // Update budgets state
        console.log("Fetched budgets:", newBudgets);
      },
      (error) => {
        console.error("Error fetching budgets:", error);
        setLoading(false);
      }
    );

    // Fetch user balance
    const unsubscribeBalance = onSnapshot(
      doc(db, "users", uid),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setUserBalance(docSnapshot.data().balance || 0); // Update user balance
          console.log("Fetched user balance:", docSnapshot.data().balance);
        }
      },
      (error) => {
        console.error("Error fetching user balance:", error);
        setLoading(false);
      }
    );

    // Cleanup listeners when component unmounts
    return () => {
      unsubscribeBudgets();
      unsubscribeBalance();
    };
  }, [uid]);

  useEffect(() => {
    // Only update availableBalance when both budgets and userBalance are fetched
    if (loading || !userBalance || !budgets.length) return;

    const totalBudgeted = budgets.reduce((acc, budget) => acc + budget.amount, 0);
    const available = userBalance - totalBudgeted;
    setAvailableBalance(available); // Update available balance

    setLoading(false); // Stop loading once data is fetched and available balance is updated
    console.log("Updated available balance:", available);
  }, [budgets, userBalance, loading]); // Depend on budgets and userBalance

  return (
    <GlobalDataContext.Provider value={{ budgets, userBalance, availableBalance, setAvailableBalance }}>
      {children}
    </GlobalDataContext.Provider>
  );
};

export const useGlobalData = () => {
  return useContext(GlobalDataContext);
};




