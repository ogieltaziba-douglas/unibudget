import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { AuthContext } from "../store/auth-context";
import { Navigation } from "../App";

const mockNotAuthenticated = {
  token: "",
  uid: "",
  displayName: "",
  isAuthenticated: false,
  loading: false,
  authenticate: jest.fn(),
  logout: jest.fn(),
};

const mockAuthenticated = {
  token: "dummy-token",
  uid: "dummy-uid",
  displayName: "Test User",
  isAuthenticated: true,
  loading: false,
  authenticate: jest.fn(),
  logout: jest.fn(),
};

describe("Navigation Component", () => {
  it("renders the AuthStack when the user is not authenticated", async () => {
    const { getByTestId } = render(
      <AuthContext.Provider value={mockNotAuthenticated}>
        <Navigation />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(getByTestId("login-screen")).toBeTruthy();
    });
  });

  it("renders the AuthenticatedStack when the user is authenticated", async () => {
    const { getByTestId } = render(
      <AuthContext.Provider value={mockAuthenticated}>
        <Navigation />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(getByTestId("home-screen")).toBeTruthy();
    });
  });
});
