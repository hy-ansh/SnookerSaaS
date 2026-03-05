CREATE TYPE "GameType" AS ENUM ('LTP', 'SPLIT', 'SOLO', 'CUSTOM');

ALTER TABLE "Session" ADD COLUMN "gameType" "GameType";
ALTER TABLE "Session" ADD COLUMN "winnerIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
