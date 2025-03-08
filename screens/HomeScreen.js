import { useContext, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { AuthContext } from "../store/auth-context";
import { db } from "../util/firebase";
import { Colors } from "../constants/styles";
import { formatDistanceToNow } from "date-fns";
import { Picker } from "@react-native-picker/picker";
import {
  VictoryPie,
  VictoryChart,
  VictoryBar,
  VictoryAxis,
} from "victory-native";

function HomeScreen() {
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [userName, setUserName] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [transactionPurpose, setTransactionPurpose] = useState("");
  const [transactionCategory, setTransactionCategory] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const authCtx = useContext(AuthContext);
  const userId = authCtx.uid;

  useEffect(() => {
    if (!authCtx.loading && userId) {
      fetchUserData();
    } else if (!authCtx.loading && !userId) {
      console.warn("Skipping fetchUserData because userId is undefined.");
    }
  }, [authCtx.loading, userId]);

  useEffect(() => {
    if (!authCtx.loading && !userId) {
      setBalance(0);
      setIncome(0);
      setExpenses(0);
      setTransactions([]);
    }
  }, [authCtx.loading, userId]);

  async function fetchUserData() {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserName(userData.name);
        setBalance(userData.balance || 0);

        const transactions = userData.transactions || [];
        transactions.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );

        // Keep only the 7 most recent transactions
        setTransactions(transactions.slice(0, 8));
        calculateIncomeAndExpenses(transactions);
      } else {
        await setDoc(userDocRef, {
          balance: 0,
          transactions: [],
          name: "User",
        });

        setBalance(0);
        setTransactions([]);
        calculateIncomeAndExpenses([]);
      }
    } catch (error) {
      setErrorMessage(
        "An error occurred while fetching user data. Please try again."
      );
    }
  }

  function calculateIncomeAndExpenses(transactions) {
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach((transaction) => {
      if (transaction.type === "income") {
        totalIncome += transaction.amount;
      } else {
        totalExpenses += transaction.amount;
      }
    });

    setIncome(totalIncome);
    setExpenses(totalExpenses);
  }

  function openTransactionModal(type) {
    setTransactionType(type);
    setIsModalVisible(true);
  }

  async function handleAddTransaction() {
    const amount = parseFloat(transactionAmount);

    if (
      isNaN(amount) ||
      amount <= 0 ||
      !transactionPurpose ||
      !transactionCategory
    ) {
      setErrorMessage("Please enter a valid amount, purpose, and category.");
      return;
    }

    const transactionData = {
      amount: amount,
      type: transactionType,
      purpose: transactionPurpose,
      category: transactionCategory,
      timestamp: new Date().toISOString(),
    };

    try {
      const userDocRef = doc(db, "users", userId);
      const docSnapshot = await getDoc(userDocRef);

      if (!docSnapshot.exists()) {
        await setDoc(userDocRef, {
          balance: 0,
          transactions: [],
        });
      }

      const newBalance =
        transactionType === "income" ? balance + amount : balance - amount;

      await updateDoc(userDocRef, {
        balance: newBalance,
        transactions: arrayUnion(transactionData),
      });
      setTransactions((prev) =>
        [...prev, transactionData]
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 8)
      );

      setBalance(newBalance);
      calculateIncomeAndExpenses([...transactions, transactionData]);

      setIsModalVisible(false);
      setTransactionAmount("");
      setTransactionPurpose("");
      setTransactionCategory("");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        "An error occurred while adding the transaction. Please try again."
      );
    }
  }

  function renderChart() {
    console.log("Income:", income, "Expenses:", expenses);

    if (
      isNaN(income) ||
      isNaN(expenses) ||
      income === undefined ||
      expenses === undefined
    ) {
      return <Text style={styles.errorText}>Loading chart data...</Text>;
    }

    const data = [
      { x: "Income", y: income },
      { x: "Expenses", y: expenses },
    ];

    return (
      <VictoryChart domainPadding={40}>
        <VictoryAxis dependentAxis />
        <VictoryAxis />
        <VictoryBar
          data={data}
          style={{
            data: {
              fill: ({ datum }) =>
                datum.x === "Income" ? "#4caf50" : "#f44336",
            },
          }}
        />
      </VictoryChart>
    );
  }

  if (authCtx.loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary500} />
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Unable to load user data. Please try logging in again.
        </Text>
      </View>
    );
  }

  const incomeCategories = [
    { label: "Salary", value: "Salary" },
    { label: "Gift", value: "Gift" },
    { label: "Other", value: "Other" },
  ];

  const expenseCategories = [
    { label: "Shopping", value: "Shopping" },
    { label: "Food & Drinks", value: "Food & drinks" },
    { label: "Bills & Utilities", value: "Bills & Utilities" },
    { label: "Entertainment", value: "Entertainment" },
    { label: "Others", value: "Others" },
  ];

  const categories =
    transactionType === "income" ? incomeCategories : expenseCategories;

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>
        {userName ? `Welcome ${userName},` : "Welcome User,"}
      </Text>

      {/* <Text style={styles.title}>Total Balance</Text> */}
      <View style={styles.balanceContainer}>
        <Text style={styles.balance}>£{balance.toLocaleString()}</Text>
        <View style={styles.incomeExpenseContainer}>
          <Text style={styles.income}>Income: £{income.toLocaleString()}</Text>
          <Text style={styles.expense}>
            Expenses: £{expenses.toLocaleString()}
          </Text>
        </View>
        {/* <View>
          <Text style={styles.subtitle}>Income vs Expenses:</Text>
          {renderChart()}
        </View> */}
      </View>

      <View style={styles.transactionButtonsContainer}>
        <TouchableOpacity
          style={[styles.transactionButton, styles.incomeButton]}
          onPress={() => openTransactionModal("income")}
        >
          <Text style={styles.buttonText}>+ Add Income</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.transactionButton, styles.expenseButton]}
          onPress={() => openTransactionModal("expense")}
        >
          <Text style={styles.buttonText}>- Add Expense</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Recent Transactions:</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.transaction}>
            <Text>
              {item.type === "income" ? "+" : "-"}£{item.amount.toFixed(2)}
            </Text>
            <Text style={styles.timestamp}>
              {formatDistanceToNow(new Date(item.timestamp))} ago
            </Text>
          </View>
        )}
      />

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {transactionType === "income" ? "Add Income" : "Add Expense"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              keyboardType="decimal-pad"
              value={transactionAmount}
              onChangeText={setTransactionAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter purpose"
              value={transactionPurpose}
              onChangeText={setTransactionPurpose}
            />
            <Picker
              selectedValue={transactionCategory}
              onValueChange={setTransactionCategory}
              style={styles.input}
            >
              <Picker.Item label="Select Category" value="" />
              {categories.map((category) => (
                <Picker.Item
                  key={category.value}
                  label={category.label}
                  value={category.value}
                />
              ))}
            </Picker>
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleAddTransaction}
            >
              <Text style={styles.modalButtonText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#ccc" }]}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "left",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  balanceContainer: {
    backgroundColor: Colors.primary500,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  balance: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  incomeExpenseContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 12,
  },
  income: {
    color: "#4caf50",
    fontWeight: "bold",
  },
  expense: {
    color: "#f44336",
    fontWeight: "bold",
  },
  transactionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  transactionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  incomeButton: {
    backgroundColor: "#4caf50",
  },
  expenseButton: {
    backgroundColor: "#f44336",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  transaction: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timestamp: {
    color: "#888",
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  input: {
    width: "100%",
    padding: 10,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: Colors.primary500,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
