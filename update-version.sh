#!/bin/bash

FILE="version.json"

# Se il file non esiste, lo crea
if [ ! -f "$FILE" ]; then
  echo '{ "version": "1.0.0" }' > $FILE
fi

# Legge la versione attuale
VERSION=$(grep -oP '(?<="version": ")[^"]+' $FILE)

# Divide in major.minor.patch
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

# Incrementa la patch
PATCH=$((PATCH + 1))

# Ricompone la versione
NEW_VERSION="$MAJOR.$MINOR.$PATCH"

# Scrive nel file
echo "{ \"version\": \"$NEW_VERSION\" }" > $FILE

echo "Nuova versione: $NEW_VERSION"
