-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projetos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projetos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocos" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "blocos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rodadas" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "instrucao" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rodadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ideias" (
    "id" TEXT NOT NULL,
    "rodadaId" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "veredito" TEXT NOT NULL DEFAULT 'neutro',
    "comentario" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ideias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompts" (
    "id" TEXT NOT NULL,
    "ideiaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "json" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "largura" INTEGER NOT NULL DEFAULT 0,
    "altura" INTEGER NOT NULL DEFAULT 0,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "projetos_updatedAt_idx" ON "projetos"("updatedAt");

-- CreateIndex
CREATE INDEX "blocos_projetoId_idx" ON "blocos"("projetoId");

-- CreateIndex
CREATE UNIQUE INDEX "blocos_projetoId_tipo_key" ON "blocos"("projetoId", "tipo");

-- CreateIndex
CREATE INDEX "rodadas_projetoId_numero_idx" ON "rodadas"("projetoId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "rodadas_projetoId_numero_key" ON "rodadas"("projetoId", "numero");

-- CreateIndex
CREATE INDEX "ideias_rodadaId_ordem_idx" ON "ideias"("rodadaId", "ordem");

-- CreateIndex
CREATE INDEX "ideias_projetoId_idx" ON "ideias"("projetoId");

-- CreateIndex
CREATE UNIQUE INDEX "prompts_ideiaId_key" ON "prompts"("ideiaId");

-- AddForeignKey
ALTER TABLE "blocos" ADD CONSTRAINT "blocos_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rodadas" ADD CONSTRAINT "rodadas_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ideias" ADD CONSTRAINT "ideias_rodadaId_fkey" FOREIGN KEY ("rodadaId") REFERENCES "rodadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ideias" ADD CONSTRAINT "ideias_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_ideiaId_fkey" FOREIGN KEY ("ideiaId") REFERENCES "ideias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

