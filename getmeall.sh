#!/bin/bash

./getmenode.sh
npm i -g yarn
yarn
./getmepostgres.sh
./getmeall.sh

