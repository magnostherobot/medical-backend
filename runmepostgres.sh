#!/bin/bash

read -p "Press [Enter] key to start Postgres (will already be running if you just got it) use ctl+c to cancel";
echo "> Starting Server";
~/pg/postgres/bin/pg_ctl -D ~/pg/postgres/data/ -l POSTGRES_logfile start;

#echo "> Conecting as admin user: " + ${USER};
#~/pg/postgres/bin/psql -U ${USER} postgres;
