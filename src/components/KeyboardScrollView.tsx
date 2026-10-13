import { ReactNode, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardEvent,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";

interface Props {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

// Shrinks the visible area by the keyboard height in sync with the keyboard
// animation, so centered content rises together with the focused input.
// JS-only (works in Expo Go), no KeyboardAvoidingView / LayoutAnimation.
export default function KeyboardScrollView({
  children,
  contentContainerStyle,
}: Props) {
  const inset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ios = Platform.OS === "ios";
    const animateTo = (value: number, duration: number) =>
      Animated.timing(inset, {
        toValue: value,
        duration,
        easing: Easing.bezier(0.17, 0.59, 0.4, 0.77), // iOS keyboard curve
        useNativeDriver: false,
      }).start();

    const onShow = (e: KeyboardEvent) =>
      animateTo(e.endCoordinates.height, ios ? e.duration || 250 : 0);
    const onHide = (e: KeyboardEvent) =>
      animateTo(0, ios ? e.duration || 250 : 0);

    const subs = [
      Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", onShow),
      Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", onHide),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [inset]);

  return (
    <Animated.View style={[styles.flex, { paddingBottom: inset }]}>
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
