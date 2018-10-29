#!/bin/bash
cwd=$(pwd)

cd $cwd/packages/vendors-dll
npm publish

cd ../interfaces
npm publish

cd ../utils
npm publish

cd ../isomorphic
npm publish

cd ../front
npm publish

cd ../back
npm publish

