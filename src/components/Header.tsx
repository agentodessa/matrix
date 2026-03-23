import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export function Header({ title = "The Executive", showBack = false }: HeaderProps) {
  const router = useRouter();

  return (
    <View className="bg-header-bg px-5 pb-3 pt-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          {showBack ? (
            <Pressable onPress={() => router.back()} className="p-1">
              <Text className="font-body text-base text-heading">←</Text>
            </Pressable>
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-avatar-bg">
              <Text className="font-display text-base font-bold text-heading">A</Text>
            </View>
          )}
          <Text className="font-body text-2xl font-semibold tracking-tight text-heading">
            {title}
          </Text>
        </View>
        <Pressable className="h-8 w-8 items-center justify-center">
          <Text className="text-xl text-meta">⚙</Text>
        </Pressable>
      </View>
    </View>
  );
}
