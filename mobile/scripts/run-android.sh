#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

pick_java_home() {
  if [ -n "${JAVA_HOME:-}" ] && [ -x "${JAVA_HOME}/bin/java" ]; then
    major="$("${JAVA_HOME}/bin/java" -version 2>&1 | awk -F[\".] '/version/ { print $2; exit }')"
    if [ "${major:-0}" -ge 17 ] && [ "${major:-0}" -le 21 ]; then
      echo "$JAVA_HOME"
      return
    fi
  fi

  for candidate in \
    "$HOME/Library/Java/JavaVirtualMachines/ms-17"*/Contents/Home \
    "$HOME/Library/Java/JavaVirtualMachines/graalvm-jdk-17"*/Contents/Home \
    "$HOME/Library/Java/JavaVirtualMachines/jdk-17"*/Contents/Home \
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  do
    if [ -x "${candidate}/bin/java" ]; then
      echo "$candidate"
      return
    fi
  done

  if command -v /usr/libexec/java_home >/dev/null 2>&1; then
    /usr/libexec/java_home -v 17 2>/dev/null && return
    /usr/libexec/java_home -v 21 2>/dev/null && return
  fi

  return 1
}

pick_android_sdk() {
  if [ -n "${ANDROID_HOME:-}" ] && [ -d "$ANDROID_HOME" ]; then
    echo "$ANDROID_HOME"
    return
  fi
  if [ -n "${ANDROID_SDK_ROOT:-}" ] && [ -d "$ANDROID_SDK_ROOT" ]; then
    echo "$ANDROID_SDK_ROOT"
    return
  fi
  if [ -d "$HOME/Library/Android/sdk" ]; then
    echo "$HOME/Library/Android/sdk"
    return
  fi
  return 1
}

JAVA_HOME="$(pick_java_home)" || {
  echo "No JDK 17–21 found. Install one (or set JAVA_HOME) before building Android." >&2
  exit 1
}

ANDROID_HOME="$(pick_android_sdk)" || {
  echo "Android SDK not found. Set ANDROID_HOME or install the SDK under ~/Library/Android/sdk." >&2
  exit 1
}

export JAVA_HOME
export ANDROID_HOME
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

LOCAL_PROPERTIES="$ROOT_DIR/android/local.properties"
mkdir -p "$ROOT_DIR/android"
printf 'sdk.dir=%s\n' "${ANDROID_HOME//\\/\\\\}" > "$LOCAL_PROPERTIES"

echo "Using JAVA_HOME=$JAVA_HOME"
echo "Using ANDROID_HOME=$ANDROID_HOME"
exec npx expo run:android "$@"
