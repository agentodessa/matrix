import { Platform, useColorScheme } from "react-native";
import { useTranslation } from "react-i18next";
import SegmentedControl from "@react-native-segmented-control/segmented-control";

interface ViewModeToggleProps {
  value: "focus" | "matrix";
  onChange: (mode: "focus" | "matrix") => void;
}

const NativeToggle = ({ value, onChange }: ViewModeToggleProps) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const segments = [t("Focus"), t("Matrix")];

  return (
    <SegmentedControl
      values={segments}
      selectedIndex={value === "focus" ? 0 : 1}
      onChange={(e) => {
        const idx = e.nativeEvent.selectedSegmentIndex;
        onChange(idx === 0 ? "focus" : "matrix");
      }}

      fontStyle={{
        fontSize: 13,
        fontWeight: "600",
        fontFamily: "Inter",
        color: isDark ? "#a9b4b9" : "#566166",
      }}
      activeFontStyle={{
        fontSize: 13,
        fontWeight: "700",
        fontFamily: "Inter",
        color: "#ffffff",
      }}
    />
  );
};

// Lazy-load web implementation only on web
let WebToggle: React.ComponentType<ViewModeToggleProps>;

if (Platform.OS === "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  WebToggle = require("./ViewModeToggle.web").WebViewModeToggle;
}

export const ViewModeToggle = (props: ViewModeToggleProps) => {
  if (Platform.OS === "web") {
    return <WebToggle {...props} />;
  }
  return <NativeToggle {...props} />;
};
