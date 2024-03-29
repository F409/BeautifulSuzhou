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
  http://localhost:1008/api/users \
  -H "content-type: application/x-www-form-urlencoded" \
  -d 'username=Jim&orgName=Org1')
echo $ORG1_TOKEN
ORG1_TOKEN=$(echo $ORG1_TOKEN | jq ".token" | sed "s/\"//g")
echo
echo "ORG1 token is $ORG1_TOKEN"
echo
echo "POST request Enroll on Org2 ..."
echo
ORG2_TOKEN=$(curl -s -X POST \
  http://localhost:1008/api/users \
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
  http://localhost:1008/api/channels \
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
  http://localhost:1008/api/channels/mychannel/peers \
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
  http://localhost:1008/api/channels/mychannel/peers \
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
  http://localhost:1008/api/chaincodes \
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
  http://localhost:1008/api/chaincodes \
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
  http://localhost:1008/api/channels/mychannel/chaincodes \
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

echo "POST invoke chaincode:generateAsset on peers of Org1"
echo
TRX_ID=$(curl -s -X POST \
  http://localhost:1008/api/channels/mychannel/chaincodes/mycc \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["peer0.org1.example.com","peer1.org1.example.com"],
	"fcn":"generateAsset",
	"args":["{\"AssetID\":\"001\",\"Type\":\"money\",\"Number\":16,\"GameCompany\":\"Tencent\",\"GameName\":\"chiji\",\"ReleaseTime\":\"2017-11-25T08:31:01.956Z\",\"Owner\":\"Liyiming\",\"AssetInfo\":\"nothing\",\"GameAssetImageHash\":\"12258db5c652fed8fd402eb3101b439d\",\"TransactionInfo\":[\"init\"]}"]
}')
echo "Transacton ID is $TRX_ID"
echo
echo

echo "GET query chaincode:getGameAssetInfo on peer1 of Org1"
echo
curl -s -X GET \
  "http://localhost:1008/api/channels/mychannel/chaincodes/mycc?peer=peer0.org1.example.com&fcn=getGameAssetInfo&args=%5b%22001%22%5d" \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo
echo

echo "POST invoke chaincode:changeGameAssetOwner on peers of Org1"
echo
TRX_ID=$(curl -s -X POST \
  http://localhost:1008/api/channels/mychannel/chaincodes/mycc \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["peer0.org1.example.com","peer1.org1.example.com"],
	"fcn":"changeGameAssetOwner",
	"args":["001","wangyi","changtowangyi"]
}')
echo "Transacton ID is $TRX_ID"
echo
echo

echo "GET query chaincode:getGameAssetInfo on peer1 of Org1"
echo
curl -s -X GET \
  "http://localhost:1008/api/channels/mychannel/chaincodes/mycc?peer=peer0.org1.example.com&fcn=getGameAssetInfo&args=%5b%22001%22%5d" \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo
echo

echo "POST invoke chaincode:deleteGameAsset on peers of Org1"
echo
TRX_ID=$(curl -s -X POST \
  http://localhost:1008/api/channels/mychannel/chaincodes/mycc \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["peer0.org1.example.com","peer1.org1.example.com"],
	"fcn":"deleteGameAsset",
	"args":["001"]
}')
echo "Transacton ID is $TRX_ID"
echo
echo
#
# echo "POST invoke chaincode:generateUser on peers of Org1"
# echo
# TRX_ID=$(curl -s -X POST \
#   http://localhost:1008/api/channels/mychannel/chaincodes/mycc \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 	"peers": ["peer0.org1.example.com","peer1.org1.example.com"],
# 	"fcn":"generateUser",
# 	"args":["{\"UserID\":\"001\",\"Name\":\"xujinging\",\"Email\":\"123456@qq.com\",\"Balance\":3.14,\"AssetList\":[\"001\",\"002\"],\"AssetForSale\":[\"000\"],\"TransactionInfo\":\"init\"}"]
# }')
# echo "Transacton ID is $TRX_ID"
# echo
# echo
#
# echo "GET query chaincode:getUserInfo on peer1 of Org1"
# echo
# curl -s -X GET \
#   "http://localhost:1008/api/channels/mychannel/chaincodes/mycc?peer=peer0.org1.example.com&fcn=getUserInfo&args=%5b%22001%22%5d" \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json"
# echo
# echo
#
# echo "POST invoke chaincode:changeUser.Name on peers of Org1"
# echo
# TRX_ID=$(curl -s -X POST \
#   http://localhost:1008/api/channels/mychannel/chaincodes/mycc \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 	"peers": ["peer0.org1.example.com","peer1.org1.example.com"],
# 	"fcn":"changeUser",
# 	"args":["001","Name","liulietong"]
# }')
# echo "Transacton ID is $TRX_ID"
# echo
# echo
#
# echo "POST invoke chaincode:changeUser.Email on peers of Org1"
# echo
# TRX_ID=$(curl -s -X POST \
#   http://localhost:1008/api/channels/mychannel/chaincodes/mycc \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 	"peers": ["peer0.org1.example.com","peer1.org1.example.com"],
# 	"fcn":"changeUser",
# 	"args":["001","Email","654321@qq.com"]
# }')
# echo "Transacton ID is $TRX_ID"
# echo
# echo
#
# echo "POST invoke chaincode:changeUser.Balance on peers of Org1"
# echo
# TRX_ID=$(curl -s -X POST \
#   http://localhost:1008/api/channels/mychannel/chaincodes/mycc \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 	"peers": ["peer0.org1.example.com","peer1.org1.example.com"],
# 	"fcn":"changeUser",
# 	"args":["001","Balance","4.13"]
# }')
# echo "Transacton ID is $TRX_ID"
# echo
# echo
#
# echo "POST invoke chaincode:changeUser.addAssetList on peers of Org1"
# echo
# TRX_ID=$(curl -s -X POST \
#   http://localhost:1008/api/channels/mychannel/chaincodes/mycc \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 	"peers": ["peer0.org1.example.com","peer1.org1.example.com"],
# 	"fcn":"changeUser",
# 	"args":["001","addAssetList","003"]
# }')
# echo "Transacton ID is $TRX_ID"
# echo
# echo
#
# echo "POST invoke chaincode:changeUser.deleteAssetList on peers of Org1"
# echo
# TRX_ID=$(curl -s -X POST \
#   http://localhost:1008/api/channels/mychannel/chaincodes/mycc \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 	"peers": ["peer0.org1.example.com","peer1.org1.example.com"],
# 	"fcn":"changeUser",
# 	"args":["001","deleteAssetList","001"]
# }')
# echo "Transacton ID is $TRX_ID"
# echo
# echo
#
# echo "POST invoke chaincode:changeUser.addAssetForSale on peers of Org1"
# echo
# TRX_ID=$(curl -s -X POST \
#   http://localhost:1008/api/channels/mychannel/chaincodes/mycc \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 	"peers": ["peer0.org1.example.com","peer1.org1.example.com"],
# 	"fcn":"changeUser",
# 	"args":["001","addAssetForSale","001"]
# }')
# echo "Transacton ID is $TRX_ID"
# echo
# echo
#
# echo "POST invoke chaincode:changeUser.deleteAssetForSale on peers of Org1"
# echo
# TRX_ID=$(curl -s -X POST \
#   http://localhost:1008/api/channels/mychannel/chaincodes/mycc \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 	"peers": ["peer0.org1.example.com","peer1.org1.example.com"],
# 	"fcn":"changeUser",
# 	"args":["001","deleteAssetForSale","000"]
# }')
# echo "Transacton ID is $TRX_ID"
# echo
# echo
#
# echo "GET query chaincode:getUserInfo on peer1 of Org1"
# echo
# curl -s -X GET \
#   "http://localhost:1008/api/channels/mychannel/chaincodes/mycc?peer=peer0.org1.example.com&fcn=getUserInfo&args=%5b%22001%22%5d" \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json"
# echo
# echo

# echo "GET query Block by blockNumber"
# echo
# curl -s -X GET \
#   "http://localhost:1008/api/channels/mychannel/blocks/1?peer=peer0.org1.example.com" \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json"
# echo
# echo
#
# echo "GET query Transaction by TransactionID"
# echo
# curl -s -X GET http://localhost:1008/api/channels/mychannel/transactions/$TRX_ID?peer=peer0.org1.example.com \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json"
# echo
# echo

############################################################################
### TODO: What to pass to fetch the Block information
############################################################################
#echo "GET query Block by Hash"
#echo
#hash=????
#curl -s -X GET \
#  "http://localhost:1008/api/channels/mychannel/blocks?hash=$hash&peer=peer1" \
#  -H "authorization: Bearer $ORG1_TOKEN" \
#  -H "cache-control: no-cache" \
#  -H "content-type: application/json" \
#  -H "x-access-token: $ORG1_TOKEN"
#echo
#echo

# echo "GET query ChainInfo"
# echo
# curl -s -X GET \
#   "http://localhost:1008/api/channels/mychannel?peer=peer0.org1.example.com" \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json"
# echo
# echo
#
# echo "GET query Installed chaincodes"
# echo
# curl -s -X GET \
#   "http://localhost:1008/api/chaincodes?peer=peer0.org1.example.com" \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json"
# echo
# echo
#
# echo "GET query Instantiated chaincodes"
# echo
# curl -s -X GET \
#   "http://localhost:1008/api/channels/mychannel/chaincodes?peer=peer0.org1.example.com" \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json"
# echo
# echo
#
# echo "GET query Channels"
# echo
# curl -s -X GET \
#   "http://localhost:1008/api/channels?peer=peer0.org1.example.com" \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json"
# echo
# echo


echo "Total execution time : $(($(date +%s)-starttime)) secs ..."
