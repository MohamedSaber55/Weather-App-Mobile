const { withAppBuildGradle } = require('expo/config-plugins')

/**
 * Two things `expo prebuild` regenerates away every time, kept here so they survive:
 *
 * 1. Release signing from `credentials/keystore.properties` (the template signs
 *    release builds with Expo's shared debug key).
 * 2. On Windows, CMake object paths mirror the full source path and blow past the
 *    260-character limit, so the native build is staged in a short directory.
 *    Set WX_CMAKE_STAGING_DIR to change it; ignored on macOS/Linux.
 */
const withAndroidBuildFixes = config =>
  withAppBuildGradle(config, gradleConfig => {
    let contents = gradleConfig.modResults.contents

    if (!contents.includes('WX_STORE_FILE')) {
      contents = contents.replace(
        /signingConfigs \{\s*\n(\s*)debug \{/,
        (match, indent) =>
          `signingConfigs {\n${indent}release {\n` +
          `${indent}    def props = new Properties()\n` +
          `${indent}    def propsFile = rootProject.file('../credentials/keystore.properties')\n` +
          `${indent}    if (propsFile.exists()) {\n` +
          `${indent}        propsFile.withInputStream { props.load(it) }\n` +
          `${indent}        storeFile file(props['WX_STORE_FILE'])\n` +
          `${indent}        storePassword props['WX_STORE_PASSWORD']\n` +
          `${indent}        keyAlias props['WX_KEY_ALIAS']\n` +
          `${indent}        keyPassword props['WX_KEY_PASSWORD']\n` +
          `${indent}    }\n` +
          `${indent}}\n${indent}debug {`
      )

      // release currently points at signingConfigs.debug; send it to the real key when we have one
      const releaseBlock = contents.indexOf('release {', contents.indexOf('buildTypes {'))
      const debugSigning = contents.indexOf('signingConfig signingConfigs.debug', releaseBlock)
      if (releaseBlock !== -1 && debugSigning !== -1) {
        contents =
          contents.slice(0, debugSigning) +
          "signingConfig rootProject.file('../credentials/keystore.properties').exists() ? signingConfigs.release : signingConfigs.debug" +
          contents.slice(debugSigning + 'signingConfig signingConfigs.debug'.length)
      }
    }

    const stagingDir = process.env.WX_CMAKE_STAGING_DIR || 'C:/x'
    if (process.platform === 'win32' && !contents.includes('buildStagingDirectory')) {
      contents = contents.replace(
        /\n(\s*)signingConfigs \{/,
        (match, indent) =>
          `\n${indent}// Windows path-length workaround — see README\n` +
          `${indent}externalNativeBuild {\n` +
          `${indent}    cmake {\n` +
          `${indent}        buildStagingDirectory = file("${stagingDir}")\n` +
          `${indent}    }\n` +
          `${indent}}\n\n${indent}signingConfigs {`
      )
    }

    gradleConfig.modResults.contents = contents
    return gradleConfig
  })

module.exports = withAndroidBuildFixes
