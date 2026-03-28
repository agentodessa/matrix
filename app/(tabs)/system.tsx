import { ScrollView } from "react-native";
import { SafeAreaView } from "@/lib/styled";
import { Header } from "@/components/Header";
import { AccountSection } from "@/components/settings/AccountSection";
import { SubscriptionSection } from "@/components/settings/SubscriptionSection";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { OrganizationSection } from "@/components/settings/OrganizationSection";
import { DataSection } from "@/components/settings/DataSection";
import { AboutSection } from "@/components/settings/AboutSection";

export default function SystemScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header />
      <ScrollView
        contentContainerClassName="px-7 pt-8 pb-32 gap-8"
        showsVerticalScrollIndicator={false}
      >
        <AccountSection />
        <SubscriptionSection />
        <AppearanceSection />
        <OrganizationSection />
        <DataSection />
        <AboutSection />
      </ScrollView>
    </SafeAreaView>
  );
}
