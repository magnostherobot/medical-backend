#!/bin/bash

./getmeall.sh
./runmepostgres.sh
./redis-stable/src/redis-server redis-stable/redis.conf &
