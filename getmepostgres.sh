#!/bin/bash

echo "> Checking for postgres at ~/pg";
if [ -d "~/pg" ]; then
  echo "Postgres Directory exists, nevermind...";
  exit 1;
fi

echo " ";
echo " ";
echo " ";
echo "This installation process takes ~3:50 minutes to complete.";
echo " ";
echo " ";
echo " ";
sleep 3;

echo "> Making postgres directory at ~/pg";
mkdir ~/pg;
currentDir=$(pwd);

echo "> Chaning dir to ~/pg";
cd ~/pg;

echo "> Cloning Repo";
git clone https://github.com/postgres/postgres.git;

echo "> Checking out to version 10.1";
cd ./postgres;
git reset --hard REL_10_1;

echo "> Configuring";
./configure --prefix=$HOME/pg/postgres/ --with-python PYTHON=/usr/bin/python2.7;

echo "> Building Postgres";
make -j 5;

echo "> Installing Postgres";
make install;

echo "> Initialise the Database";
~/pg/postgres/bin/initdb -D ~/pg/postgres/data/;
echo " ";
echo " ";
echo " ";
echo " ";
echo "> Starting the postgres server";
~/pg/postgres/bin/pg_ctl -D ~/pg/postgres/data/ -l POSTGRES_logfile start;
echo "> Create the Database";
~/pg/postgres/bin/createdb be4;
echo "> Creating Admin user";
~/pg/postgres/bin/psql -U ${USER} postgres -c "CREATE USER admin WITH PASSWORD 'eprprJacR0hBpmWvs5IDJZTnjRAY2gM3tSm0b1af';";
echo "> Granting Admin Permissions";
~/pg/postgres/bin/psql -U ${USER} postgres -c "ALTER DATABASE be4 OWNER TO admin;";


echo " ";
echo " ";
echo " ";
echo " ";
echo " ";
echo "> Completed the installation of Postgres.";
cd $currentDir;
