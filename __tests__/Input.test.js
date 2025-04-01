import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import Input from "../components/Auth/Input";

describe("Input Component", () => {
  it("renders the label text correctly", () => {
    const { getByText } = render(
      <Input
        label="Email Address"
        onUpdateValue={() => {}}
        value=""
        isInvalid={false}
      />
    );
    expect(getByText("Email Address")).toBeTruthy();
  });

  it("displays the initial value in the TextInput", () => {
    const { getByDisplayValue } = render(
      <Input
        label="Email Address"
        onUpdateValue={() => {}}
        value="test@example.com"
        isInvalid={false}
      />
    );
    expect(getByDisplayValue("test@example.com")).toBeTruthy();
  });

  it("calls onUpdateValue when text changes", () => {
    const onUpdateValueMock = jest.fn();
    const { getByDisplayValue } = render(
      <Input
        label="Email Address"
        onUpdateValue={onUpdateValueMock}
        value="initial@example.com"
        isInvalid={false}
      />
    );

    const textInput = getByDisplayValue("initial@example.com");
    fireEvent.changeText(textInput, "new@example.com");
    expect(onUpdateValueMock).toHaveBeenCalledWith("new@example.com");
  });
});
