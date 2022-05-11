SELECT mail, sum(amount) AS balance
FROM credit
GROUP BY mail
ORDER BY at DESC
