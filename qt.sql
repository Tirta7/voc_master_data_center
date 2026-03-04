-- Show all tables with relay pins
SELECT id, "tableName", "relayPin", "macAddress", status FROM tables ORDER BY id;

-- Show duplicate relay pins  
SELECT "relayPin", COUNT(*) as jumlah, STRING_AGG("tableName", ', ') as meja
FROM tables 
GROUP BY "relayPin" 
HAVING COUNT(*) > 1;
