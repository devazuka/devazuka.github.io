SELECT id FROM entity
LEFT JOIN atom ON e = id
WHERE type = ? AND a = ? AND v = ?
ORDER BY t ASC
