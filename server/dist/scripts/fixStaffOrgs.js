"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log('Starting backfill of missing organizationId for STAFF users...');
        // Find all users who are missing an organizationId but have a role assigned
        const orphanedUsers = yield prisma.user.findMany({
            where: {
                organizationId: null,
                roleId: { not: null }
            },
            include: { role: true }
        });
        console.log(`Found ${orphanedUsers.length} orphaned users missing organizationId.`);
        let updatedCount = 0;
        for (const user of orphanedUsers) {
            if ((_a = user.role) === null || _a === void 0 ? void 0 : _a.organizationId) {
                yield prisma.user.update({
                    where: { id: user.id },
                    data: { organizationId: user.role.organizationId }
                });
                console.log(`Updated user ${user.email} with orgId ${user.role.organizationId}`);
                updatedCount++;
            }
            else {
                // If the role itself somehow doesn't have an org, assign the first org as a fallback (for test envs)
                const firstOrg = yield prisma.organization.findFirst();
                if (firstOrg) {
                    yield prisma.user.update({
                        where: { id: user.id },
                        data: { organizationId: firstOrg.id }
                    });
                    console.log(`Updated user ${user.email} with fallback orgId ${firstOrg.id}`);
                    updatedCount++;
                }
            }
        }
        console.log(`Backfill complete. Updated ${updatedCount} users.`);
    });
}
main()
    .catch(e => console.error(e))
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
