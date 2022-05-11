SELECT amount
FROM credit
WHERE booking=:booking
ORDER BY at DESC
LIMIT 1
