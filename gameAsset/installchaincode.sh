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

echo "POST request Enroll on Org1  ..."
echo
ORG1_TOKEN=$(curl -s -X POST \
  http://localhost:4000/api/users \
  -H "content-type: application/x-www-form-urlencoded" \
  -d 'username=Jim&orgName=Org1')
ORG1_TOKEN=$(echo $ORG1_TOKEN | jq ".token" | sed "s/\"//g")
echo
echo "ORG1 token is $ORG1_TOKEN"
echo
echo "POST request Enroll on Org2 ..."
echo
ORG2_TOKEN=$(curl -s -X POST \
  http://localhost:4000/api/users \
  -H "content-type: application/x-www-form-urlencoded" \
  -d 'username=Barry&orgName=Org2')
echo $ORG2_TOKEN
ORG2_TOKEN=$(echo $ORG2_TOKEN | jq ".token" | sed "s/\"//g")
echo
echo "ORG2 token is $ORG2_TOKEN"
echo
echo
echo "POST request Create channel  ..."
echo
curl -s -X POST \
  http://localhost:4000/api/channels \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"channelName":"mychannel",
	"channelConfigPath":"../artifacts/channel/mychannel.tx"
}'
echo
echo
sleep 5
echo "POST request Join channel on Org1"
echo
curl -s -X POST \
  http://localhost:4000/api/channels/mychannel/peers \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["peer0.org1.example.com","peer1.org1.example.com"]
}'
echo
echo

echo "POST request Join channel on Org2"
echo
curl -s -X POST \
  http://localhost:4000/api/channels/mychannel/peers \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["peer0.org2.example.com","peer1.org2.example.com"]
}'
echo
echo

echo "POST Install chaincode on Org1"
echo
curl -s -X POST \
  http://localhost:4000/api/chaincodes \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d "{
	\"peers\": [\"peer0.org1.example.com\",\"peer1.org1.example.com\"],
	\"chaincodeName\":\"mycc\",
	\"chaincodePath\":\"$CC_SRC_PATH\",
	\"chaincodeType\": \"$LANGUAGE\",
	\"chaincodeVersion\":\"v0\"
}"
echo
echo

echo "POST Install chaincode on Org2"
echo
curl -s -X POST \
  http://localhost:4000/api/chaincodes \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json" \
  -d "{
	\"peers\": [\"peer0.org2.example.com\",\"peer1.org2.example.com\"],
	\"chaincodeName\":\"mycc\",
	\"chaincodePath\":\"$CC_SRC_PATH\",
	\"chaincodeType\": \"$LANGUAGE\",
	\"chaincodeVersion\":\"v0\"
}"
echo
echo

echo "POST instantiate chaincode on peer1 of Org1"
echo
curl -s -X POST \
  http://localhost:4000/api/channels/mychannel/chaincodes \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d "{
	\"chaincodeName\":\"mycc\",
	\"chaincodeVersion\":\"v0\",
	\"chaincodeType\": \"$LANGUAGE\",
  \"functionName\":\"init\",
	\"args\":[]
}"
echo
echo
echo "Total execution time : $(($(date +%s)-starttime)) secs ..."
echo "POST request add User on Org1  ..."

response1=$(curl -s -X POST \
  http://localhost:4000/api/addUser \
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
# echo "POST request add User on Org2  ..."

response2=$(curl -s -X POST \
  http://localhost:4000/api/addUser \
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
  http://localhost:4000/api/addUser \
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
