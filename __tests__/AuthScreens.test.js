import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import SignupScreen from "../screens/SignupScreen";
import LoginScreen from "../screens/LoginScreen";
import { AuthContext } from "../store/auth-context";

jest.mock("../components/Auth/AuthContent", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return (props) => (
    <Text testID="auth-content">
      {props.isLogin ? "Login Content" : "Signup Content"}
    </Text>
  );
});

const mockAuth = {
  uid: "test-user",
  loading: false,
  authenticate: jest.fn(),
};

describe("SignupScreen", () => {
  it("renders signup content", async () => {
    const { getByTestId } = render(
      <AuthContext.Provider value={mockAuth}>
        <SignupScreen />
      </AuthContext.Provider>
    );
    await waitFor(() => {
      expect(getByTestId("auth-content").props.children).toEqual(
        "Signup Content"
      );
    });
  });
});

describe("LoginScreen", () => {
  it("renders login content", async () => {
    const { getByTestId } = render(
      <AuthContext.Provider value={mockAuth}>
        <LoginScreen />
      </AuthContext.Provider>
    );
    await waitFor(() => {
      expect(getByTestId("auth-content").props.children).toEqual(
        "Login Content"
      );
    });
  });
});
