#!/bin/bash

echo "> Starting Server";
~/pg/postgres/bin/pg_ctl -D ~/pg/postgres/data/ -l POSTGRES_logfile start;

echo "> Conecting as admin user: " + ${USER};
~/pg/postgres/bin/psql -U ${USER} postgres;
