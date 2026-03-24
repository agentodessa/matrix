import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Keyboard, useColorScheme, Alert } from "react-native";
import { SafeAreaView } from "../../src/lib/styled";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { Header } from "../../src/components/Header";
import { useAuth } from "../../src/lib/auth-store";

interface FormData {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const colorScheme = useColorScheme();
  const placeholderColor = colorScheme === "dark" ? "rgba(229,226,225,0.4)" : "#717c82";
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useForm<FormData>({
    defaultValues: { displayName: "", email: "", password: "", confirmPassword: "" },
    mode: "onChange",
  });

  const password = watch("password");

  const onSubmit = async (data: FormData) => {
    Keyboard.dismiss();
    setLoading(true);
    const result = await signUp(data.email, data.password, data.displayName);
    setLoading(false);

    if (result.success) {
      router.back();
    } else {
      Alert.alert("Sign Up Failed", result.error ?? "Something went wrong");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header title="Create Account" showBack />
      <ScrollView
        contentContainerClassName="px-7 pt-6 pb-40 gap-5"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <View className="gap-2">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
            Name
          </Text>
          <Controller
            control={control}
            name="displayName"
            rules={{ required: true, minLength: 2 }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="font-body text-lg font-bold text-heading border-b border-border pb-3"
                placeholder="Your name"
                placeholderTextColor={placeholderColor}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
                returnKeyType="next"
              />
            )}
          />
        </View>

        {/* Email */}
        <View className="gap-2">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
            Email
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
                placeholder="you@email.com"
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
            Password
          </Text>
          <Controller
            control={control}
            name="password"
            rules={{ required: true, minLength: 6 }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="font-body text-lg font-bold text-heading border-b border-border pb-3"
                placeholder="Min 6 characters"
                placeholderTextColor={placeholderColor}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                returnKeyType="next"
              />
            )}
          />
        </View>

        {/* Confirm Password */}
        <View className="gap-2">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
            Confirm Password
          </Text>
          <Controller
            control={control}
            name="confirmPassword"
            rules={{
              required: true,
              validate: (v) => v === password || "Passwords don't match",
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="font-body text-lg font-bold text-heading border-b border-border pb-3"
                placeholder="Re-enter password"
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
            {loading ? "Creating account..." : "Create Account"}
          </Text>
        </Pressable>

        {/* Switch to sign in */}
        <Pressable
          className="items-center active:opacity-70"
          onPress={() => router.replace("/auth/sign-in")}
        >
          <Text className="font-body text-sm text-meta">
            Already have an account?{" "}
            <Text className="font-bold text-heading">Sign In</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
