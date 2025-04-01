import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import HomeScreen from "../screens/HomeScreen";
import { AuthContext } from "../store/auth-context";

let onSnapshotCallback; 

jest.mock("firebase/firestore", () => {
  const originalModule = jest.requireActual("firebase/firestore");
  return {
    ...originalModule,
    doc: jest.fn(),
    setDoc: jest.fn(() => Promise.resolve()),
    onSnapshot: jest.fn((docRef, successCallback, errorCallback) => {
      onSnapshotCallback = successCallback;
      const fakeSnapshot = {
        exists: () => true,
        data: () => ({
          name: "Test User",
          balance: 100,
          transactions: [
            {
              type: "income",
              amount: 200,
              purpose: "Test Income",
              timestamp: new Date().toISOString(),
            },
            {
              type: "expense",
              amount: 100,
              purpose: "Test Expense",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
        docs: [],
      };
      successCallback(fakeSnapshot);
      return () => {};
    }),
    runTransaction: jest.fn(() => Promise.resolve()),
    updateDoc: jest.fn(() => Promise.resolve()),
    arrayUnion: (item) => [item],
  };
});

jest.mock("../util/firebase", () => ({
  db: {},
}));

const authContextValue = {
  loading: false,
  uid: "test-uid",
  authenticate: jest.fn(),
  logout: jest.fn(),
};

describe("HomeScreen", () => {
  it("renders welcome message, balance, and income/expenses from user data", async () => {
    const { getByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <HomeScreen />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(getByText(/Welcome Test User/)).toBeTruthy();
      expect(getByText("£100")).toBeTruthy();
      expect(getByText(/Income: £200/)).toBeTruthy();
      expect(getByText(/Expenses: £100/)).toBeTruthy();
    });
  });

  it('opens the "Add Income" modal when the "+ Add Income" button is pressed', async () => {
    const { getByText, getByPlaceholderText, queryByPlaceholderText } = render(
      <AuthContext.Provider value={authContextValue}>
        <HomeScreen />
      </AuthContext.Provider>
    );

    expect(queryByPlaceholderText("Enter amount")).toBeNull();
    fireEvent.press(getByText("+ Add Income"));

    await waitFor(() => {
      expect(getByPlaceholderText("Enter amount")).toBeTruthy();
      expect(getByText("Add Income")).toBeTruthy();
    });
  });

  it('opens the "Add Expense" modal when the "- Add Expense" button is pressed', async () => {
    const { getByText, getByPlaceholderText, queryByPlaceholderText } = render(
      <AuthContext.Provider value={authContextValue}>
        <HomeScreen />
      </AuthContext.Provider>
    );

    expect(queryByPlaceholderText("Enter amount")).toBeNull();
    fireEvent.press(getByText("- Add Expense"));

    await waitFor(() => {
      expect(getByPlaceholderText("Enter amount")).toBeTruthy();
      expect(getByText("Add Expense")).toBeTruthy();
    });
  });

  it('opens the "Edit Balance" modal when the "Edit Balance" button is pressed', async () => {
    const { getByText, getByPlaceholderText, queryByPlaceholderText } = render(
      <AuthContext.Provider value={authContextValue}>
        <HomeScreen />
      </AuthContext.Provider>
    );

    expect(queryByPlaceholderText("Enter new balance")).toBeNull();
    fireEvent.press(getByText("Edit Balance"));

    await waitFor(() => {
      expect(getByPlaceholderText("Enter new balance")).toBeTruthy();
    });
  });

  it("renders a list of transactions", async () => {
    const { getByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <HomeScreen />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(getByText("Test Income")).toBeTruthy();
      expect(getByText("Test Expense")).toBeTruthy();
    });
  });

  it("opens the chart modal when the balance container is pressed and navigates through chart pages", async () => {
    const { getByText, queryByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <HomeScreen />
      </AuthContext.Provider>
    );

    const chartTrigger = getByText("Tap for Charts");
    fireEvent.press(chartTrigger);

    await waitFor(() => {
      expect(getByText("Income/Expenses")).toBeTruthy();
    });

    fireEvent.press(getByText("Next"));
    await waitFor(() => {
      expect(getByText("Recent Income by Category")).toBeTruthy();
    });

    fireEvent.press(getByText("Back"));
    await waitFor(() => {
      expect(getByText("Income/Expenses")).toBeTruthy();
    });

    fireEvent.press(getByText("Close"));
    await waitFor(() => {
      expect(queryByText("Income/Expenses")).toBeNull();
    });
  });

  it("updates the displayed balance when a new income is added dynamically and adds the new transaction to the list", async () => {
    const { getByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <HomeScreen />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(getByText("£100")).toBeTruthy();
      expect(getByText(/Income: £200/)).toBeTruthy();
      expect(getByText(/Expenses: £100/)).toBeTruthy();
    });

    const newSnapshotIncome = {
      exists: () => true,
      data: () => ({
        name: "Test User",
        balance: 400, 
        transactions: [
          {
            type: "income",
            amount: 200,
            purpose: "Test Income",
            timestamp: new Date().toISOString(),
          },
          {
            type: "income",
            amount: 300,
            purpose: "New Income",
            timestamp: new Date().toISOString(),
          },
          {
            type: "expense",
            amount: 100,
            purpose: "Test Expense",
            timestamp: new Date().toISOString(),
          },
        ],
      }),
      docs: [],
    };

    await act(async () => {
      onSnapshotCallback(newSnapshotIncome);
    });

    await waitFor(() => {
      expect(getByText("£400")).toBeTruthy();
      expect(getByText(/Income: £500/)).toBeTruthy(); 
      expect(getByText(/Expenses: £100/)).toBeTruthy();
      expect(getByText("New Income")).toBeTruthy();
    });
  });

  it("updates the displayed balance when a new expense is added dynamically and adds the new transaction to the list", async () => {
    const { getByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <HomeScreen />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(getByText("£100")).toBeTruthy();
      expect(getByText(/Income: £200/)).toBeTruthy();
      expect(getByText(/Expenses: £100/)).toBeTruthy();
    });

    const newSnapshotExpense = {
      exists: () => true,
      data: () => ({
        name: "Test User",
        balance: 50, 
        transactions: [
          {
            type: "income",
            amount: 200,
            purpose: "Test Income",
            timestamp: new Date().toISOString(),
          },
          {
            type: "expense",
            amount: 100,
            purpose: "Test Expense",
            timestamp: new Date().toISOString(),
          },
          {
            type: "expense",
            amount: 50,
            purpose: "New Expense",
            timestamp: new Date().toISOString(),
          },
        ],
      }),
      docs: [],
    };

    await act(async () => {
      onSnapshotCallback(newSnapshotExpense);
    });

    
    await waitFor(() => {
      expect(getByText("£50")).toBeTruthy();
      expect(getByText(/Expenses: £150/)).toBeTruthy(); 
      expect(getByText(/Income: £200/)).toBeTruthy();
      expect(getByText("New Expense")).toBeTruthy();
    });
  });
});
