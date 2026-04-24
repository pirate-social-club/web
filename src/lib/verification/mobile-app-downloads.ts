export type VerificationMobileApp = "self" | "very";

export const VERIFICATION_MOBILE_APP_DOWNLOADS: Record<VerificationMobileApp, {
  androidUrl: string;
  appName: string;
  iosUrl: string;
}> = {
  self: {
    androidUrl: "https://play.google.com/store/apps/details?id=com.proofofpassportapp",
    appName: "Self",
    iosUrl: "https://apps.apple.com/us/app/self-zk-passport-identity/id6478563710",
  },
  very: {
    androidUrl: "https://play.google.com/store/apps/details?id=xyz.veros.app&pli=1",
    appName: "VeryAI",
    iosUrl: "https://apps.apple.com/us/app/veryai-proof-of-reality/id6746761869",
  },
};
