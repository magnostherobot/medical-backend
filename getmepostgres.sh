#!/bin/bash

PGDIR=${1-"$PWD/pg"}

echo "> Checking for postgres at $PGDIR";
if [ -d "$PGDIR" ]; then
  echo "Postgres Directory exists, nevermind...";
  exit 1;
fi

echo;
echo;
echo;
echo "This installation process takes ~3:50 minutes to complete.";
echo;
echo;
echo;

echo "> Making postgres directory at $PGDIR";
mkdir -p "$PGDIR";
currentDir=$(pwd);

echo "> Changing dir to $PGDIR";
cd "$PGDIR";

echo "> Cloning Repo";
git clone https://github.com/postgres/postgres.git;

echo "> Checking out to version 10.1";
cd ./postgres;
git reset --hard REL_10_1;

echo "> Configuring";
./configure --prefix="$PWD" --with-python PYTHON="/usr/bin/python2.7";

echo "> Building Postgres";
make;

echo "> Installing Postgres";
make install;

echo "> Initialise the Database";
"$PGDIR/postgres/bin/initdb" -D "$PGDIR/postgres/data/";
echo;
echo;
echo;
echo;
echo "> Starting the postgres server";
"$PGDIR/postgres/bin/pg_ctl" -D "$PGDIR/postgres/data/" -l POSTGRES_logfile start;
echo "> Create the Database";
"$PGDIR/postgres/bin/createdb" be4;
echo "> Creating Admin user";
"$PGDIR/postgres/bin/psql" -U ${USER} postgres -c "CREATE USER admin;";
echo "> Granting Admin Permissions";
"$PGDIR/postgres/bin/psql" -U ${USER} postgres -c "ALTER DATABASE be4 OWNER TO admin;";


echo;
echo;
echo;
echo;
echo;
echo "> Completed the installation of Postgres.";
cd $currentDir;
