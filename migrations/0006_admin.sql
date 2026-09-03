-- Feature flags administráveis pelo painel /admin, sem precisar redeployar
-- pra mudar uma env var. Sem UI de gestão de usuários/roles aqui — quem é
-- superadmin/developer continua vindo de SUPERADMIN_EMAILS/DEVELOPER_EMAILS
-- (env var), não desta tabela.

CREATE TABLE IF NOT EXISTS admin_feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);
