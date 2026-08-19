#!/usr/bin/env bash
# React Native's NDK build fails on JDK 25 (the JBR bundled with Android
# Studio) with "a restricted method in java.lang.System has been called".
# Find a JDK 17 if the current one is too new, then run the given command.
set -e

needs_jdk17() {
  [ -z "${JAVA_HOME:-}" ] && return 0
  local major
  major=$("$JAVA_HOME/bin/java" -version 2>&1 | head -1 | sed -E 's/.*"([0-9]+).*/\1/')
  [ "$major" != "17" ]
}

if needs_jdk17; then
  for candidate in \
    "$HOME"/.local/share/mise/installs/java/temurin-17* \
    /Library/Java/JavaVirtualMachines/*17*/Contents/Home \
    "$HOME"/Library/Java/JavaVirtualMachines/*17*/Contents/Home \
    /opt/homebrew/opt/openjdk@17 \
    /usr/lib/jvm/java-17-openjdk*; do
    if [ -x "$candidate/bin/java" ]; then
      export JAVA_HOME="$candidate"
      break
    fi
  done
fi

if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  echo "No JDK 17 found. Install one, e.g.:" >&2
  echo "  mise install java@temurin-17 && mise use java@temurin-17" >&2
  echo "  # or: brew install openjdk@17" >&2
  exit 1
fi

echo "Using JDK at $JAVA_HOME"
exec "$@"
