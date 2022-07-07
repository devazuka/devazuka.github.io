SELECT e, a, v, t FROM atom
LEFT JOIN entity ON e = id
WHERE type = ? AND a = ?
ORDER BY t ASC
