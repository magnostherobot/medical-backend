#!/bin/bash

./getmenode.sh
npm i -g yarn
yarn
./getmepostgres.sh
./getmecziconversion.sh
./getmeredis.sh

echo "COMPLETE! Ready to use.";
