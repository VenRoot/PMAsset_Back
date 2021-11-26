#!/bin/bash

rsync -ar --exclude=*.ts ./src/* ./out/ 
mv out/server/* server/
rmdir out/server

cp -r out/src/* out/
rm -rf out/src