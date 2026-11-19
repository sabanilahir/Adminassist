import { prisma } from "@/lib/prisma";

export const DEFAULT_BRANDING = {
  appName: "ASSIST",
  appDescription: "Astragraphia Solution Support System Ticketing",
  // Logo bawaan horizontal (ideal untuk login horizontal & header)
  logoHorizontalLight: "/images/branding/logo-horizontal-light.png",
  logoHorizontalDark: "/images/branding/logo-horizontal-dark.png",
  // Logo bawaan stacked / vertical
  logoStackedLight: "/images/branding/logo-stacked-light.png",
  logoStackedDark: "/images/branding/logo-stacked-dark.png",
  // Logo compact (icon + assist)
  logoCompactLight: "/images/branding/logo-compact-light.png",
  logoCompactDark: "/images/branding/logo-compact-dark.png",
};

export async function getAppBranding() {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { id: "default" },
    });

    return {
      appName: setting?.appName || DEFAULT_BRANDING.appName,
      appDescription: setting?.appDescription || DEFAULT_BRANDING.appDescription,
      loginLayout: setting?.loginLayout || "horizontal",
      logoLightUrl: setting?.logoLightUrl || DEFAULT_BRANDING.logoHorizontalLight,
      logoDarkUrl: setting?.logoDarkUrl || DEFAULT_BRANDING.logoHorizontalDark,
      hasCustomLight: Boolean(setting?.logoLightUrl),
      hasCustomDark: Boolean(setting?.logoDarkUrl),
    };
  } catch (error) {
    console.error("Gagal mengambil AppBranding:", error);
    return {
      appName: DEFAULT_BRANDING.appName,
      appDescription: DEFAULT_BRANDING.appDescription,
      loginLayout: "horizontal",
      logoLightUrl: DEFAULT_BRANDING.logoHorizontalLight,
      logoDarkUrl: DEFAULT_BRANDING.logoHorizontalDark,
      hasCustomLight: false,
      hasCustomDark: false,
    };
  }
}
