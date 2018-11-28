#!/bin/bash
cwd=$(pwd)
tgdir=$cwd/pre_publish_build_tmp


mkdir $tgdir
cd $tgdir

git clone $cwd .

npm i
npm run lint
npm run test
npm run build

cd ..
rm -rf $tgdir

echo "Pre publish test well done;"
echo ""
echo "==========================="

exit 0
