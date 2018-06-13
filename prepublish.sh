#!/bin/bash
cwd=$(pwd)
tgdir=$cwd/../crew-prepublish-test


mkdir $tgdir
cd $tgdir

git clone $cwd .

npm i
npm run lint
npm run test

cd ..
rm -rf $tgdir

exit 0;
