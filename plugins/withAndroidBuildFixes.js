const { withAppBuildGradle, withProjectBuildGradle } = require('expo/config-plugins')

const stagingDir = () => process.env.WX_CMAKE_STAGING_DIR || 'C:/x'

/**
 * Three things `expo prebuild` regenerates away every time, kept here so they survive:
 *
 * 1. Release signing from `credentials/keystore.properties` (the template signs
 *    release builds with Expo's shared debug key).
 * 2. On Windows, CMake object paths mirror the full source path and blow past the
 *    260-character limit, so the app's native build is staged in a short directory.
 *    Set WX_CMAKE_STAGING_DIR to change it; ignored on macOS/Linux.
 * 3. The same limit bites the native modules inside node_modules — there ninja
 *    cannot stat its own outputs and loops on "manifest still dirty after 100
 *    tries" — so every subproject gets a short staging directory too.
 */
const withSigningAndStaging = config =>
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

    if (process.platform === 'win32' && !contents.includes('buildStagingDirectory')) {
      contents = contents.replace(
        /\n(\s*)signingConfigs \{/,
        (match, indent) =>
          `\n${indent}// Windows path-length workaround — see README\n` +
          `${indent}externalNativeBuild {\n` +
          `${indent}    cmake {\n` +
          `${indent}        buildStagingDirectory = file("${stagingDir()}")\n` +
          `${indent}    }\n` +
          `${indent}}\n\n${indent}signingConfigs {`
      )
    }

    gradleConfig.modResults.contents = contents
    return gradleConfig
  })

// node_modules sits deeper than the app module, so its native builds need the
// same treatment — expo-modules-core is the one that trips over it first.
const withModuleStaging = config =>
  withProjectBuildGradle(config, gradleConfig => {
    if (process.platform !== 'win32') return gradleConfig
    let contents = gradleConfig.modResults.contents
    if (contents.includes('buildStagingDirectory')) return gradleConfig

    contents = contents.replace(
      'apply plugin: "expo-root-project"',
      '// Windows path-length workaround — CMake mirrors the full source path under\n' +
        '// .cxx, which blows past 260 characters inside node_modules and leaves ninja\n' +
        '// regenerating the same manifest forever. Stage every native module short.\n' +
        'subprojects { subproject ->\n' +
        '  afterEvaluate {\n' +
        "    if (subproject.plugins.hasPlugin('com.android.library') || subproject.plugins.hasPlugin('com.android.application')) {\n" +
        '      subproject.android {\n' +
        '        externalNativeBuild {\n' +
        '          cmake {\n' +
        `            buildStagingDirectory = file("${stagingDir()}/" + subproject.name)\n` +
        '          }\n' +
        '        }\n' +
        '      }\n' +
        '    }\n' +
        '  }\n' +
        '}\n\n' +
        'apply plugin: "expo-root-project"'
    )

    gradleConfig.modResults.contents = contents
    return gradleConfig
  })

const withAndroidBuildFixes = config => withModuleStaging(withSigningAndStaging(config))

module.exports = withAndroidBuildFixes
