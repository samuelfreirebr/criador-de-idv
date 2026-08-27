#!/bin/sh
set -e

# O Swarm IGNORA `depends_on`. A aplicação sobe junto com o Postgres e, nos
# primeiros segundos, o banco ainda não aceita conexão — sem esta espera o
# container morreria, reiniciaria, morreria de novo, e o Traefik responderia
# 404 por não ter nenhuma réplica de pé.
echo "[entrypoint] aguardando o banco de dados…"

TENTATIVAS=60
i=1
while [ "$i" -le "$TENTATIVAS" ]; do
  if ./migrator/node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma; then
    echo "[entrypoint] migrações aplicadas."
    break
  fi

  if [ "$i" -eq "$TENTATIVAS" ]; then
    echo "[entrypoint] ERRO: o banco não respondeu depois de $TENTATIVAS tentativas."
    echo "[entrypoint] Confira DATABASE_URL — a senha precisa ser a mesma de"
    echo "[entrypoint] POSTGRES_PASSWORD, e o host precisa ser 'db'."
    exit 1
  fi

  echo "[entrypoint] banco ainda não respondeu (tentativa $i de $TENTATIVAS), aguardando…"
  i=$((i + 1))
  sleep 2
done

# Cria (ou atualiza) o administrador a partir das variáveis da stack.
# Não interrompe o boot se falhar: um erro aqui não pode derrubar o site.
node criar-usuario.mjs || true

echo "[entrypoint] iniciando aplicação…"
exec "$@"
