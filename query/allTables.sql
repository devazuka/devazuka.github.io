SELECT
  m.name as "table", 
  p.name as key,
  p.type as type,
  (
    SELECT "to" FROM pragma_foreign_key_list(m.name) AS f
    WHERE f."from" = p.name
  ) refKey,
  (
    SELECT "table" FROM pragma_foreign_key_list(m.name) AS f
    WHERE f."from" = p.name
  ) refTable
FROM
  sqlite_master AS m
JOIN
  pragma_table_info(m.name) AS p
WHERE
  m.name NOT LIKE 'sqlite_%'
ORDER BY
  m.name,
  p.cid