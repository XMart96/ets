import { LoaderCircle } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleProp, ViewStyle } from "react-native";
import { colors } from "@/theme";

interface LoaderProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

// Spinning lucide icon; the rotation runs on the native driver.
export default function Loader({
  size = 32,
  color = colors.primary,
  style,
}: LoaderProps) {
  const [rotation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={[
        { alignSelf: "center", width: size, height: size, transform: [{ rotate: spin }] },
        style,
      ]}
    >
      <LoaderCircle size={size} color={color} />
    </Animated.View>
  );
}
