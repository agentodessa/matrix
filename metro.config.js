const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /ios\/EisenhowerMatrixProductivity\.xcodeproj\/.*/,
  /ios\/EisenhowerMatrixProductivity\.xcworkspace\/.*/,
  /ios\/EisenhowerMatrixProductivity\/.*/,
  /ios\/ci_scripts\/.*/,
  /ios\/build\/.*/,
  /ios\/Pods\/.*/,
];

module.exports = withNativewind(wrapWithReanimatedMetroConfig(config));
