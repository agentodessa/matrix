import { ScrollView } from "react-native";
import { SafeAreaView } from "../../src/lib/styled";
import { Header } from "../../src/components/Header";
import { AccountSection } from "../../src/components/settings/AccountSection";
import { SubscriptionSection } from "../../src/components/settings/SubscriptionSection";
import { AppearanceSection } from "../../src/components/settings/AppearanceSection";
import { OrganizationSection } from "../../src/components/settings/OrganizationSection";
import { DataSection } from "../../src/components/settings/DataSection";
import { AboutSection } from "../../src/components/settings/AboutSection";

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
