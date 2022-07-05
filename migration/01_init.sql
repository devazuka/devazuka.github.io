CREATE TABLE IF NOT EXISTS transactions (
  at   INTEGER NOT NULL, -- day of the transaction
  mail TEXT    NOT NULL, -- customer email
  name TEXT    NOT NULL, -- customer name
  pass TEXT    NOT NULL, -- day / month
  tax  TEXT,             -- NIF or other tax id
  ref  TEXT,             -- stripe checkout id, if null -> cash transaction
  rm   INTEGER           -- refunded at
);

/* TODO:

- Create manual transactions
- Group transactions by (mail)
