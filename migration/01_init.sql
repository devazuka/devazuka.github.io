CREATE TABLE entity (
  id   INTEGER PRIMARY KEY,
  type TEXT NOT NULL     -- description of the operation
);

CREATE TABLE tx (
  ts REAL PRIMARY KEY, -- timestamp of the transaction
  op TEXT NOT NULL     -- description of the operation
) WITHOUT ROWID;

CREATE TABLE atom (
  e INTEGER,             -- entity
  a TEXT    NOT NULL,    -- attribute
  v BLOB,                -- value, null = retracted
  t REAL    NOT NULL,    -- timestamp of the transaction
  FOREIGN KEY(e) REFERENCES entity(id),
  FOREIGN KEY(t) REFERENCES tx(ts),
  PRIMARY KEY(e, a, t)
) WITHOUT ROWID;
