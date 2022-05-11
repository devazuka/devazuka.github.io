SELECT *
FROM booking
WHERE mail=:mail AND for=:for AND start=:start
LIMIT 1
