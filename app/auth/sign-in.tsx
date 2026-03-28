import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Keyboard, useColorScheme, Alert } from "react-native";
import { SafeAreaView } from "../../src/lib/styled";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { Header } from "../../src/components/Header";
import { GoogleSignInButton } from "../../src/components/GoogleSignInButton";
import { useAuth } from "../../src/lib/auth-store";
import { useTranslation } from "react-i18next";

interface FormData {
  email: string;
  password: string;
}

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const placeholderColor = colorScheme === "dark" ? "rgba(229,226,225,0.4)" : "#717c82";
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<FormData>({
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  const onSubmit = async (data: FormData) => {
    Keyboard.dismiss();
    setLoading(true);
    const result = await signIn(data.email, data.password);
    setLoading(false);

    if (result.success) {
      router.back();
    } else {
      Alert.alert(t("Sign In Failed"), result.error ?? t("Something went wrong"));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header title={t("Sign In")} showBack />
      <ScrollView
        contentContainerClassName="px-7 pt-6 pb-40 gap-5"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Email */}
        <View className="gap-2">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
            {t("Email")}
          </Text>
          <Controller
            control={control}
            name="email"
            rules={{
              required: true,
              pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="font-body text-lg font-bold text-heading border-b border-border pb-3"
                placeholder={t("you@email.com")}
                placeholderTextColor={placeholderColor}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            )}
          />
        </View>

        {/* Password */}
        <View className="gap-2">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
            {t("Password")}
          </Text>
          <Controller
            control={control}
            name="password"
            rules={{ required: true }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="font-body text-lg font-bold text-heading border-b border-border pb-3"
                placeholder={t("Your password")}
                placeholderTextColor={placeholderColor}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                returnKeyType="done"
              />
            )}
          />
        </View>

        {/* Submit */}
        <Pressable
          className={
            isValid && !loading
              ? "bg-success rounded-xl py-4 items-center active:opacity-80 mt-2"
              : "bg-btn-surface rounded-xl py-4 items-center opacity-50 mt-2"
          }
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || loading}
        >
          <Text
            className={
              isValid && !loading
                ? "font-body text-base font-extrabold text-bg tracking-wide"
                : "font-body text-base font-bold text-meta"
            }
          >
            {loading ? t("Signing in...") : t("Sign In")}
          </Text>
        </Pressable>

        {/* Divider */}
        <View className="flex-row items-center gap-3">
          <View className="flex-1 h-px bg-border/15" />
          <Text className="font-body text-xs text-meta">{t("or")}</Text>
          <View className="flex-1 h-px bg-border/15" />
        </View>

        {/* Google */}
        <GoogleSignInButton onSuccess={() => router.back()} />

        {/* Switch to sign up */}
        <Pressable
          className="items-center active:opacity-70"
          onPress={() => router.replace("/auth/sign-up")}
        >
          <Text className="font-body text-sm text-meta">
            {t("Don't have an account?")}{" "}
            <Text className="font-bold text-heading">{t("Create One")}</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
