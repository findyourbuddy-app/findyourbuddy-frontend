process.env.TZ = "UTC";

module.exports = {
  preset: "jest-expo",
  testPathIgnorePatterns: ["/node_modules/", "/.expo/"],
};
