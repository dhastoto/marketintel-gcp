#!/bin/sh
set -e
sed "s/__APP_DB_PASSWORD__/${APP_DB_PASSWORD}/" /schema-template.sql | psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"
