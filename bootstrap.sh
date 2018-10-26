#!/bin/bash
cwd=$(pwd)

cd $cwd/packages/vendors-dll
npm i
npm run build
npm link

cd ../interfaces
npm i
npm run build
npm link

cd ../utils
npm i
npm run build
npm link

cd ../isomorphic
npm i
npm run build
npm link

cd ../front
npm i
npm run build
npm link


cd ../back
npm i
npm run build
npm link

