#!/bin/bash

git clone https://github.com/glencoesoftware/jxrlib.git
cd ./jxrlib/
mkdir build
make ${PWD}/build/JxrDecApp
cp ./build/JxrDecApp ../src/conversion/czi/JxrDecApp
cd ../
rm -rf jxrlib

curl -L https://github.com/jcupitt/libvips/releases/download/v8.6.3/vips-8.6.3.tar.gz > vips-8.6.3.tar.gz
tar xf vips-8.6.3.tar.gz
rm vips-8.6.3.tar.gz
cd vips-8.6.3
./configure
make
cp ./tools/vips ..
cd ..
rm -rf vips-8.6.3
