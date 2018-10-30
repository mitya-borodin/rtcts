#!/bin/bash
cwd=$(pwd)

cd $cwd/packages/vendors-dll
npm run sync

cd ../interfaces
npm run sync

cd ../utils
npm run sync

cd ../isomorphic
npm run sync

cd ../front
npm run sync

cd ../back
npm run sync

