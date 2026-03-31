SELECT id, "tableName", "macAddress", "lastHeartbeat", status 
FROM tables 
WHERE "deletedAt" IS NULL 
ORDER BY id;
