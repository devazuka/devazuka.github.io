SELECT e, a, v, t FROM atom
LEFT JOIN entity ON e = id
WHERE type = ?
ORDER BY t ASC
