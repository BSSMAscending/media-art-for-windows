#!/bin/bash
# Creates the self-signed code-signing certificate that signs every Mac beta, once.
# The designated requirement of an app signed with it is the certificate's hash, which
# stays the same from beta to beta, so macOS keeps the camera permission across updates.
# A new certificate would make every tester allow the camera again: this script refuses
# to run where a backup already exists. Keep the backup, it is the only copy outside CI.
# Usage: scripts/create-mac-beta-signing-cert.sh [backup-dir]
#   backup-dir defaults to $HOME/media-art-mac-beta-signing
set -euo pipefail

REPOSITORY="BSSMAscending/media-art-for-windows"
COMMON_NAME="BSSM Ascending Mac Beta"
DIR="${1:-$HOME/media-art-mac-beta-signing}"
P12="$DIR/mac-beta-signing.p12"
PASSWORD_FILE="$DIR/password.txt"

# macOS's own LibreSSL: `security` cannot read the p12 that Homebrew's OpenSSL 3 writes.
OPENSSL=/usr/bin/openssl

if [[ -e "$P12" ]]; then
  echo "A signing certificate already exists: $P12" >&2
  echo "Keep using it. A new one would make every tester allow the camera again." >&2
  echo "Delete it by hand only if you mean to replace the certificate." >&2
  exit 1
fi

umask 077
mkdir -p "$DIR"
chmod 700 "$DIR"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

cat > "$TMP/openssl.cnf" <<EOF
[req]
distinguished_name = dn
x509_extensions = v3
prompt = no
[dn]
CN = $COMMON_NAME
[v3]
keyUsage = critical, digitalSignature
extendedKeyUsage = critical, codeSigning
basicConstraints = critical, CA:false
EOF

# No trailing newline: gh secret set would keep it as part of the password.
printf '%s' "$("$OPENSSL" rand -hex 24)" > "$PASSWORD_FILE"
chmod 600 "$PASSWORD_FILE"

"$OPENSSL" req -x509 -newkey rsa:2048 -nodes -days 3650 -config "$TMP/openssl.cnf" \
  -keyout "$TMP/key.pem" -out "$TMP/cert.pem" 2> /dev/null
"$OPENSSL" pkcs12 -export -inkey "$TMP/key.pem" -in "$TMP/cert.pem" \
  -name "$COMMON_NAME" -passout "file:$PASSWORD_FILE" -out "$P12"
chmod 600 "$P12"

FINGERPRINT=$("$OPENSSL" x509 -in "$TMP/cert.pem" -noout -fingerprint -sha1 | sed 's/.*=//; s/://g')

echo "Created $P12 (valid 10 years) and $PASSWORD_FILE"
echo "SHA-1 fingerprint: $FINGERPRINT"
echo
echo "Keep $DIR backed up and private. Then store the two secrets (once):"
echo
echo "  base64 -i $P12 | gh secret set MAC_BETA_SIGNING_P12 -R $REPOSITORY"
echo "  gh secret set MAC_BETA_SIGNING_PASSWORD -R $REPOSITORY < $PASSWORD_FILE"
