#!/bin/bash
MULU=`pwd`
cnpm install

cd blockchain-explorer/app/test
cnpm install
npm run test

cd $MULU/client
cnpm install
npm test -- -u --coverage
npm run build