#!/bin/bash

git clone https://github.com/glencoesoftware/jxrlib.git
cd ./jxrlib/
mkdir build
make ${PWD}/build/JxrDecApp
cp ./build/JxrDecApp ../src/conversion/czi/JxrDecApp
cd ../
rm -rf jxrlib
