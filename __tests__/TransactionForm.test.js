import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import TransactionForm from "../components/TransactionForm";

describe("TransactionForm", () => {
  const props = {
    transactionAmount: "",
    transactionPurpose: "",
    transactionCategory: "",
    transactionType: "income",
    setTransactionAmount: jest.fn(),
    setTransactionPurpose: jest.fn(),
    setTransactionCategory: jest.fn(),
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  };

  it("renders inputs and a category picker", () => {
    const { getByPlaceholderText, getByTestId } = render(
      <TransactionForm {...props} />
    );
    expect(getByPlaceholderText("Enter amount")).toBeTruthy();
    expect(getByPlaceholderText("Enter purpose")).toBeTruthy();
    expect(getByTestId("category-picker")).toBeTruthy();
  });

  it("calls onSubmit when submit button is pressed", () => {
    const onSubmitMock = jest.fn();
    const { getByText } = render(
      <TransactionForm {...props} onSubmit={onSubmitMock} />
    );
    const submitButton = getByText("Add Income");
    fireEvent.press(submitButton);
    expect(onSubmitMock).toHaveBeenCalled();
  });

  it("calls onCancel when cancel button is pressed", () => {
    const onCancelMock = jest.fn();
    const { getByText } = render(
      <TransactionForm {...props} onCancel={onCancelMock} />
    );
    const cancelButton = getByText("Cancel");
    fireEvent.press(cancelButton);
    expect(onCancelMock).toHaveBeenCalled();
  });
});
