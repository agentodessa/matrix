import { View, Text, Pressable } from "react-native";
import { Slot, useRouter, usePathname } from "expo-router";
import { useAuth } from "../lib/auth-store";
import { useSubscription } from "../lib/subscription-store";

interface NavItem {
  route: string;
  label: string;
  icon: string;
  match: string;
}

const NAV_ITEMS: NavItem[] = [
  { route: "/(tabs)", label: "Focus", icon: "◎", match: "index" },
  { route: "/(tabs)/tasks", label: "Tasks", icon: "☰", match: "tasks" },
  { route: "/(tabs)/add", label: "New Task", icon: "+", match: "add" },
  { route: "/(tabs)/calendar", label: "Calendar", icon: "▦", match: "calendar" },
  { route: "/(tabs)/system", label: "Settings", icon: "⚙", match: "system" },
];

export function WebSidebar({ urgentCount }: { urgentCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const { isPro } = useSubscription();

  const isActive = (item: NavItem) => {
    if (item.match === "index") return pathname === "/" || pathname === "/(tabs)";
    return pathname.includes(item.match);
  };

  return (
    <View style={{ flexDirection: "row", flex: 1 }}>
      {/* Sidebar */}
      <View
        style={{
          width: 220,
          paddingTop: 24,
          paddingBottom: 24,
          justifyContent: "space-between",
        }}
        className="bg-bg-elevated"
      >
        <View>
          {/* Logo */}
          <Pressable
            style={{ paddingHorizontal: 20, paddingBottom: 24 }}
            onPress={() => router.push("/(tabs)")}
          >
            <Text className="font-display text-lg font-bold text-heading tracking-tight">
              The Executive
            </Text>
          </Pressable>

          {/* Nav items */}
          <View style={{ gap: 2 }}>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              return (
                <Pressable
                  key={item.match}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    marginHorizontal: 8,
                    borderRadius: 8,
                    backgroundColor: active ? "rgba(150,150,150,0.12)" : "transparent",
                    gap: 12,
                  }}
                  onPress={() => router.push(item.route as never)}
                >
                  <Text
                    style={{
                      fontSize: item.match === "add" ? 20 : 16,
                      width: 24,
                      textAlign: "center",
                      opacity: active ? 1 : 0.5,
                    }}
                    className="text-heading"
                  >
                    {item.icon}
                  </Text>
                  <Text
                    className={
                      active
                        ? "font-body text-sm font-bold text-heading"
                        : "font-body text-sm text-meta"
                    }
                    style={{ flex: 1 }}
                  >
                    {item.label}
                  </Text>
                  {item.match === "index" && urgentCount > 0 && (
                    <View
                      style={{
                        backgroundColor: "#ac0b18",
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 6,
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                        {urgentCount}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Bottom: user */}
        <Pressable
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 12,
            marginHorizontal: 8,
            borderRadius: 8,
            gap: 10,
          }}
          onPress={() => router.push("/profile")}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: isAuthenticated ? "rgba(0,200,120,0.15)" : "rgba(150,150,150,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 14 }}>
              {isAuthenticated
                ? user?.displayName?.charAt(0)?.toUpperCase() ?? "U"
                : "👤"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text className="font-body text-xs font-bold text-heading" numberOfLines={1}>
              {isAuthenticated ? user?.displayName : "Guest"}
            </Text>
            <Text className="font-body text-[10px] text-meta" numberOfLines={1}>
              {isAuthenticated
                ? isPro
                  ? "Pro Plan"
                  : "Free Plan"
                : "Tap to sign in"}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Main content */}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </View>
  );
}
