import { useState } from "react";
import { StyleSheet } from "react-native";

import { Button } from "@/components/Button";
import { spacing } from "@/constants/theme";
import { signOut } from "@/lib/auth";

interface DevSignOutLinkProps {
  label?: string;
}

export function DevSignOutLink({ label = "Sign out (test)" }: DevSignOutLinkProps) {
  const [signingOut, setSigningOut] = useState(false);

  async function handlePress() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Button
      title={label}
      loading={signingOut}
      onPress={handlePress}
      style={styles.button}
      textStyle={styles.text}
    />
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: "#FFA077", marginTop: spacing.lg },
  text: { color: "#0D0E0F" },
});
