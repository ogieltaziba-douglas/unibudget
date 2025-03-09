import React from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

const TransactionForm = ({
  transactionAmount,
  transactionPurpose,
  transactionCategory,
  transactionType,
  setTransactionAmount,
  setTransactionPurpose,
  setTransactionCategory,
  onSubmit,
  onCancel,
}) => {
  const incomeCategories = ["Salary", "Gift", "Other"];
  const expenseCategories = [
    "Shopping",
    "Food & Drinks",
    "Rent",
    "Bills & Utilities",
    "Entertainment",
    "Transportation",
    "Travel",
    "Savings",
    "Investments",
    "Others",
  ];

  const categories =
    transactionType === "income" ? incomeCategories : expenseCategories;

  return (
    <View style={styles.formContainer}>
      <TextInput
        style={[styles.input, { height: 45 }]}
        placeholder="Enter amount"
        keyboardType="decimal-pad"
        value={transactionAmount}
        onChangeText={setTransactionAmount}
      />
      <TextInput
        style={[styles.input, { height: 45 }]}
        placeholder="Enter purpose"
        value={transactionPurpose}
        onChangeText={setTransactionPurpose}
      />

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={transactionCategory}
          onValueChange={setTransactionCategory}
          style={
            Platform.OS === "ios" ? styles.pickerIOS : styles.pickerAndroid
          }
          mode="dropdown"
        >
          {categories.map((category) => (
            <Picker.Item key={category} label={category} value={category} />
          ))}
        </Picker>
      </View>

      <TouchableOpacity style={styles.modalButton} onPress={onSubmit}>
        <Text style={styles.modalButtonText}>
          {transactionType === "income" ? "Add Income" : "Add Expense"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modalButton, { backgroundColor: "#ccc" }]}
        onPress={onCancel}
      >
        <Text style={styles.modalButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

export default TransactionForm;

const styles = StyleSheet.create({
  formContainer: {
    width: "100%",
    alignItems: "center",
  },
  input: {
    width: "100%",
    paddingHorizontal: 10,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#fff",
    height: 45,
  },
  pickerContainer: {
    width: "100%",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  pickerIOS: {
    width: "100%",
    height: 200,
  },
  pickerAndroid: {
    width: "100%",
    height: 50,
  },
  modalButton: {
    backgroundColor: "#4caf50",
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
