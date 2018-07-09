# README

## Installing

This server has a number of dependencies. A shell script has been supplied to
automatically fetch these resources; running `getmeall.sh` should fetch all
required resources, and build them inside the project folder. If you already
have some of these resources installed on your system, comment out the
appropriate line in `getmeall.sh`.

## Running

Both PostGres and Redis will need to be running before the server is started:
```
$ ./runmepostgres.sh
$ ./runmeredis.sh
```
Then, the server itself can be run with `yarn start`. Alternatively, to run in
single-instance mode (recommended for testing), use `yarn local`.

To monitor a `yarn start`ed server, use `yarn console`.

To stop a `yarn start`ed server, use `yarn stop`.

To run tests on the server, use `yarn test`. Specific tests can be run using
other `yarn` tasks listed in `package.json`.
