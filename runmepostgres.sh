#!/bin/bash

PGDIR=${1-"$HOME/pg"}

# read -p "Press [Enter] key to start Postgres (will already be running if you just got it) use ctl+c to cancel";
echo "> Starting Server";
"$PGDIR/postgres/bin/pg_ctl" -D "$PGDIR/postgres/data/" -l POSTGRES_logfile start;

# echo "> Conecting as admin user: " + ${USER};
# "$PGDIR/postgres/bin/psql" -U ${USER} postgres;
