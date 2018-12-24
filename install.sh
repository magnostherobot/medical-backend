#!/bin/sh

EXT_DIR="$PWD/ext"

set -e

function dl {
	curl -L "$1" | tar -xz --one-top-level="$2" --strip-components 1
}

function build {
	cd "$1"
	if [ -e ./configure ]; then ./configure --prefix "$EXT_DIR"; fi
	make && make PREFIX="$EXT_DIR" install
	cd "$OLDPWD"
}

function get_postgres {
	PG_VER="REL_11_1"
	PG_DL="https://github.com/postgres/postgres/archive/$PG_VER.tar.gz"
	PG_BUILD_DIR="postgresql"
	dl "$PG_DL" "$PG_BUILD_DIR"
	build "$PG_BUILD_DIR"
	rm -r "$PG_BUILD_DIR"
}

function get_vips {
	VIPS_VER="8.7.1"
	VIPS_DL="https://github.com/libvips/libvips/releases/download/v8.7.1/vips-$VIPS_VER.tar.gz"
	VIPS_BUILD_DIR="vips"
	dl "$VIPS_DL" "$VIPS_BUILD_DIR"
	build "$VIPS_BUILD_DIR"
	rm -r "$VIPS_BUILD_DIR"
}

function get_jxrlib {
	JXR_VER="0.2.1"
	JXR_DL="https://github.com/glencoesoftware/jxrlib/archive/v$JXR_VER.tar.gz"
	JXR_BUILD_DIR="jxrlib"
	dl "$JXR_DL" "$JXR_BUILD_DIR"
	# Building of JxrDecApp is a bit funky:
	cd "$JXR_BUILD_DIR"
	make "$PWD/build/JxrDecApp"
	mkdir -p "$EXT_DIR/bin/JxrDecApp"
	cp "$PWD/build/JxrDecApp" "$EXT_DIR/bin/JxrDecApp"
	cd "$OLDPWD"
	rm -r "$JXR_BUILD_DIR"
}

function get_redis {
	REDIS_VER="5.0.2"
	REDIS_DL="https://github.com/antirez/redis/archive/$REDIS_VER.tar.gz"
	REDIS_BUILD_DIR="redis"
	dl "$REDIS_DL" "$REDIS_BUILD_DIR"
	build "$REDIS_BUILD_DIR"
	rm -r "$REDIS_BUILD_DIR"
}

function get_node_and_yarn {
	NODE_VER="9.1.0"
	NODE_DL="https://nodejs.org/download/release/v$NODE_VER/node-v$NODE_VER.tar.gz"
	NODE_BUILD_DIR="nodejs"
	dl "$NODE_DL" "$NODE_BUILD_DIR"
	build "$NODE_BUILD_DIR"
	rm -r "$NODE_BUILD_DIR"

	export PATH="$EXT_DIR/bin:$PATH"
	npm install -g yarn
	yarn
}

LOG_DIR="build_logs"
mkdir -p "$LOG_DIR"

get_postgres      >$LOG_DIR/postgres.log      2>&1 &
get_vips          >$LOG_DIR/vips.log          2>&1 &
get_jxrlib        >$LOG_DIR/jxrlib.log        2>&1 &
get_redis         >$LOG_DIR/redis.log         2>&1 &
get_node_and_yarn >$LOG_DIR/node_and_yarn.log 2>&1 &

wait
