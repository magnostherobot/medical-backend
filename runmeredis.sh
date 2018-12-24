#!/bin/sh

echo "> Starting Redis"
./redis-stable/src/redis-server redis-stable/redis.conf --daemonize yes
echo "> Redis Started"
