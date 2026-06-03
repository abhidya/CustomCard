const apiBaseUrl = process.env.CUSTOMCARD_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("CUSTOMCARD_API_BASE_URL is required for the mobile app shell.");
}

module.exports = () => ({
  expo: {
    name: "CustomCard",
    slug: "customcard",
    platforms: ["ios", "android"],
    scheme: "customcard",
    orientation: "portrait",
    ios: {
      bundleIdentifier: "com.customcard.app"
    },
    android: {
      package: "com.customcard.app"
    },
    extra: {
      apiBaseUrl,
      realOrderKillSwitch: process.env.REAL_ORDER_KILL_SWITCH ?? "disabled"
    }
  }
});
