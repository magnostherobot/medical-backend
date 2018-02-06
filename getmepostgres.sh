#!/bin/bash

echo "> Checking for postgres at ~/pg";
if [ -d "~/pg" ]; then
  echo "Postgres Directory exists, nevermind...";
  exit 1;
fi

echo "> Making postgres directory at ~/pg";
mkdir ~/pg;
currentDir=$(pwd);

echo "> Chaning dir to ~/pg";
cd ~/pg;

echo "> Cloning Repo";
git clone https://github.com/postgres/postgres.git;

echo "> Checking out to version 10";
cd ./postgres;
git reset --hard REL_10_0;

echo "> Configuring";
sleep 2;
./configure --prefix=$HOME/pg/postgres/ --with-python PYTHON=/usr/bin/python2.7;


read -p "Press [Enter] key to Build Postgres...";
echo "> Building Postgres";
make -j 5;

read -p "Press [Enter] key to Install Postgres...";
echo "> Installing Postgres";
make install;

echo "> Creating the Database";
~/pg/postgres/bin/initdb -D ~/pg/postgres/data/;

echo "";
echo "";
echo "";
echo "";
echo "";
echo "> Completed the installation of Postgres. Please use `./runmepostgres.sh` to run.";
cd $currentDir;
