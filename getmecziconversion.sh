#!/bin/bash

mkdir -p ./ext/bin

git clone https://github.com/glencoesoftware/jxrlib.git
cd ./jxrlib/
mkdir build
make ${PWD}/build/JxrDecApp
cp ./build/JxrDecApp ../ext/bin/JxrDecApp
cd ../
rm -rf jxrlib

curl -L https://github.com/jcupitt/libvips/releases/download/v8.6.3/vips-8.6.3.tar.gz > vips-8.6.3.tar.gz
tar xf vips-8.6.3.tar.gz
rm vips-8.6.3.tar.gz
cd vips-8.6.3
./configure --prefix="$PWD/../ext/"
make install
cd ..
rm -rf vips-8.6.3
PATH="$PATH:$PWD/ext/bin"
LD_LIBRARY_PATH="$LD_LIBRARY_PATH:$PWD/ext/lib"

gcc -Wall -Wextra --pedantic -std=c99 ./src/conversion/czi/cziconvert.c -o ./ext/bin/CZICrunch
