#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

jq --version > /dev/null 2>&1
if [ $? -ne 0 ]; then
	echo "Please Install 'jq' https://stedolan.github.io/jq/ to execute this script"
	echo
	exit 1
fi

starttime=$(date +%s)

# Print the usage message
function printHelp () {
  echo "Usage: "
  echo "  ./testAPIs.sh -l golang|node"
  echo "    -l <language> - chaincode language (defaults to \"golang\")"
}
# Language defaults to "golang"
LANGUAGE="golang"

# Parse commandline args
while getopts "h?l:" opt; do
  case "$opt" in
    h|\?)
      printHelp
      exit 0
    ;;
    l)  LANGUAGE=$OPTARG
    ;;
  esac
done

##set chaincode path
function setChaincodePath(){
	LANGUAGE=`echo "$LANGUAGE" | tr '[:upper:]' '[:lower:]'`
	case "$LANGUAGE" in
		"golang")
		CC_SRC_PATH="github.com/example_cc/go"
		;;
		"node")
		CC_SRC_PATH="$PWD/artifacts/src/github.com/example_cc/node"
		;;
		*) printf "\n ------ Language $LANGUAGE is not supported yet ------\n"$
		exit 1
	esac
}

setChaincodePath

echo "POST request add User on Org1  ..."

response1=$(curl -s -X POST \
  http://localhost:4000/addUser \
  -H "content-type: application/json" \
  -d '{
		"username":"Iris",
		"orgName":"Org1",
		"Password":"1234",
		"Email":"123456@qq.com",
		"Balance":100,
		"AssetList":[],
		"AssetForSale":[],
		"TransactionInfo":"GameCompany",
		"peers": ["peer0.org1.example.com","peer1.org1.example.com"],
		"fcn":"generateUser",
		"channelName":"mychannel",
		"chaincodeName":"mycc"
		 }')
echo $response1
echo "POST request add User on Org2  ..."

response2=$(curl -s -X POST \
  http://localhost:4000/addUser \
  -H "content-type: application/json" \
  -d '{
		"username":"jingjing",
		"orgName":"Org2",
		"Password":"1234",
		"Email":"123456@qq.com",
		"Balance":100,
		"AssetList":[],
		"AssetForSale":[],
		"TransactionInfo":"Personal User",
		"peers": ["peer0.org2.example.com","peer1.org2.example.com"],
		"fcn":"generateUser",
		"channelName":"mychannel",
		"chaincodeName":"mycc"
		 }')
echo $response2

response3=$(curl -s -X POST \
  http://localhost:4000/addUser \
  -H "content-type: application/json" \
  -d '{
		"username":"xiaoxu",
		"orgName":"Org2",
		"Password":"1234",
		"Email":"123456@qq.com",
		"Balance":100,
		"AssetList":[],
		"AssetForSale":[],
		"TransactionInfo":"Personal User",
		"peers": ["peer0.org2.example.com","peer1.org2.example.com"],
		"fcn":"generateUser",
		"channelName":"mychannel",
		"chaincodeName":"mycc"
		 }')
echo $response3


response4=$(curl -s -X POST \
  http://localhost:4000/login \
  -H "content-type: application/json" \
  -d '{
		"username":"xiaoxu",
		"password":"12345"
		 }')
echo $response4
