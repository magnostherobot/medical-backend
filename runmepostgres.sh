#!/bin/bash

set -e

BIN_DIR="$PWD/ext/bin"
PG_DATA=${1-"$PWD/db"}

export PATH="$BIN_DIR:$PATH"

echo "> Starting Server"
"$BIN_DIR/pg_ctl" -D "$PG_DATA/postgres/data/" -l db.log start
echo "> Server Started"
