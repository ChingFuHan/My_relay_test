#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="${HOME}/.config/gpt-relay"
ENV_FILE="${CONFIG_DIR}/env.sh"
SHELL_NAME="$(basename "${SHELL:-bash}")"

case "${SHELL_NAME}" in
  zsh)
    RC_FILE="${HOME}/.zshrc"
    ;;
  *)
    RC_FILE="${HOME}/.bashrc"
    ;;
esac

mkdir -p "${CONFIG_DIR}"

if [ ! -f "${ENV_FILE}" ]; then
  cp "$(dirname "$0")/gpt-relay-env.example.sh" "${ENV_FILE}"
  echo "Created ${ENV_FILE}"
else
  echo "Kept existing ${ENV_FILE}"
fi

SOURCE_LINE='[ -f "$HOME/.config/gpt-relay/env.sh" ] && . "$HOME/.config/gpt-relay/env.sh"'

if [ -f "${RC_FILE}" ] && grep -Fqx "${SOURCE_LINE}" "${RC_FILE}"; then
  echo "Kept existing source line in ${RC_FILE}"
else
  printf '\n%s\n' "${SOURCE_LINE}" >> "${RC_FILE}"
  echo "Appended source line to ${RC_FILE}"
fi

cat <<EOF

Next steps:
1. Edit ${ENV_FILE}
2. Replace the example values with your real host bridge settings
3. Run: . "${RC_FILE}"
4. Start Codex from that shell
EOF
