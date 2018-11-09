#!/bin/bash
cwd=$(pwd)

cd $cwd/packages/vendors-dll
npm run build
npm link

cd ../interfaces
npm run build
npm link

cd ../utils
npm run build
npm link

cd ../isomorphic
npm run build
npm link

cd ../front
npm run build
npm link

cd ../back
npm run build
npm link
