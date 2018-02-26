#!/bin/sh

CZI_WORKING_DIR=${1:-"/cs/scratch"}
CZI_EXTRACTION_DIR=${2:-"0701-extraction"}
CZI_FILE=${3:-"2016_12_17__0701.czi"}

gcc -Wall -Wextra --pedantic -std=c99 cziconvert.c
mkdir -p ${CZI_WORKING_DIR}/${USER}/${CZI_EXTRACTION_DIR}
./a.out ${CZI_WORKING_DIR}/${USER}/${CZI_FILE} ${CZI_WORKING_DIR}/${USER}/${CZI_EXTRACTION_DIR}/ ${PWD}/convertJxrs.py
rm ./a.out
