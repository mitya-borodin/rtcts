#!/bin/bash
cwd=$(pwd)

cd $cwd/packages/vendors-dll
npm run build

cd ../interfaces
npm run build

cd ../utils
npm run build

cd ../isomorphic
npm run build

cd ../front
npm run build

cd ../back
npm run build

