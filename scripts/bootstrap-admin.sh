#!/usr/bin/env bash
# Prevent shell tracing from exposing credentials, including bash -x invocation.
set +x
set -euo pipefail
cd "$(dirname "$0")/.."
trap 'unset BOOTSTRAP_ADMIN_USERNAME BOOTSTRAP_ADMIN_PASSWORD confirmation' EXIT
if [[ -z "${BOOTSTRAP_ADMIN_USERNAME:-}" || -z "${BOOTSTRAP_ADMIN_PASSWORD:-}" ]]; then
  if [[ ! -t 0 ]]; then
    echo "Нужен интерактивный терминал или оба временных параметра BOOTSTRAP_ADMIN_USERNAME и BOOTSTRAP_ADMIN_PASSWORD." >&2
    exit 1
  fi
  read -r -p "Логин первого администратора: " BOOTSTRAP_ADMIN_USERNAME
  read -r -s -p "Пароль (минимум 16 символов, ввод скрыт): " BOOTSTRAP_ADMIN_PASSWORD
  printf '\n'
  read -r -s -p "Повторите пароль: " confirmation
  printf '\n'
  if [[ "$BOOTSTRAP_ADMIN_PASSWORD" != "$confirmation" ]]; then
    echo "Пароли не совпадают. Ничего не изменено." >&2
    exit 1
  fi
fi
export BOOTSTRAP_ADMIN_USERNAME BOOTSTRAP_ADMIN_PASSWORD
./node_modules/.bin/tsx scripts/bootstrap-admin.ts
