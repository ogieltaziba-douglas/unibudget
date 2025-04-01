global.XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
import "react-native-gesture-handler/jestSetup";
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  const MockIcon = (props) => (
    <View {...props}>
      <Text>{props.name || "Icon"}</Text>
    </View>
  );
  return {
    Ionicons: MockIcon,
    MaterialIcons: MockIcon,
  };
});

jest.mock("react-native-screens", () => {
  const React = require("react");
  return {
    enableScreens: jest.fn(),
    Screen: (props) => <>{props.children}</>,
    ScreenContainer: (props) => <>{props.children}</>,
    ScreenStack: (props) => <>{props.children}</>,
  };
});

jest.mock("@react-navigation/native-stack", () => {
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }) => <>{children}</>,
      Screen: ({ component: Component, ...rest }) => <Component {...rest} />,
    }),
  };
});

jest.mock("@react-navigation/bottom-tabs", () => {
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }) => <>{children}</>,
      Screen: ({ component: Component, ...rest }) => <Component {...rest} />,
    }),
  };
});
