#!/bin/bash
cwd=$(pwd)

cd $cwd/packages/vendors-dll
npm unlink
rm -rf dll_bundle node_modules package-lock.json tsconfig.json socket.config.json tslint.json

cd ../interfaces
npm unlink
rm -rf lib package-lock.json tsconfig.json socket.config.json tslint.json

cd ../utils
npm unlink
rm -rf dll_bundle lib lib_bundle node_modules package-lock.json tsconfig.json socket.config.json tslint.json

cd ../isomorphic
npm unlink
rm -rf dll_bundle lib lib_bundle node_modules package-lock.json tsconfig.json socket.config.json tslint.json

cd ../front
npm unlink
rm -rf dll_bundle lib lib_bundle node_modules package-lock.json tsconfig.json socket.config.json tslint.json


cd ../back
npm unlink
rm -rf lib  node_modules package-lock.json tsconfig.json socket.config.json tslint.json

