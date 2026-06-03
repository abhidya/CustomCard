const required = ["CUSTOMCARD_API_BASE_URL"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Mobile shell missing env: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  const appConfigModule = await import("../app.config.js");
  const configFactory = appConfigModule.default;
  const config = configFactory();

  if (config.expo.extra.apiBaseUrl.includes("${")) {
    console.error("Mobile shell resolved a literal environment placeholder.");
    process.exitCode = 1;
  } else {
    console.log("CustomCard mobile shell configuration is present.");
  }
}
