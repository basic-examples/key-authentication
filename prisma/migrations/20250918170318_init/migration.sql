-- CreateTable
CREATE TABLE "public"."User" (
    "seq" BIGSERIAL NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "latestNonce" BYTEA,

    CONSTRAINT "User_pkey" PRIMARY KEY ("seq")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_seq_key" ON "public"."User"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "User_publicKey_key" ON "public"."User"("publicKey");
