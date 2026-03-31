SELECT 'START' || "macAddress" || 'END' FROM tables WHERE "deletedAt" IS NULL LIMIT 1;
