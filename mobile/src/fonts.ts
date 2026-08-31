import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from "@expo-google-fonts/ibm-plex-sans";
import { Fraunces_600SemiBold, Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import { useFonts } from "expo-font";

export const fonts = {
  sans: "IBMPlexSans_400Regular",
  sansMedium: "IBMPlexSans_500Medium",
  sansSemiBold: "IBMPlexSans_600SemiBold",
  sansBold: "IBMPlexSans_700Bold",
  display: "Fraunces_600SemiBold",
  displayBold: "Fraunces_700Bold",
};

export function useAppFonts() {
  return useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });
}
