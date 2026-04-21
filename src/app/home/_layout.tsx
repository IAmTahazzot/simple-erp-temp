import { StyleSheet, Text } from "react-native";

export default function RootLayout() {
  return (
    <>
      <Text style={{ fontSize: 500 }}>Hi</Text>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
