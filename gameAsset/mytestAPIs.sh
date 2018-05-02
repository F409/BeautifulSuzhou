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

response4=$(curl -s -X POST \
  http://localhost:4000/login \
  -H "content-type: application/json" \
  -d '{
		"username":"xiaoxu",
		"password":"1234"
		 }')
echo $response4
response5=$(curl -s -X POST \
  http://localhost:4000/login \
  -H "content-type: application/json" \
  -d '{
		"username":"Iris",
		"password":"1234"
		 }')
echo $response5
ORG1_TOKEN=$(echo $response5 | jq ".token" | sed "s/\"//g")
echo $ORG1_TOKEN
ORG2_TOKEN=$(echo $response4 | jq ".token" | sed "s/\"//g")
echo $ORG2_TOKEN

response6=$(curl -s -X POST \
  http://localhost:4000/login \
  -H "content-type: application/json" \
  -d '{
		"username":"jingjing",
		"password":"1234"
		 }')
BUYER_TOKEN=$(echo $response6 | jq ".token" | sed "s/\"//g")
echo $BUYER_TOKEN
echo "POST request Create new Item  ..."
echo
# createItemIds=$(curl -s -X POST \
#   http://localhost:4000/createItem \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 		"username":"Iris",
# 		"userType":"0",
# 		"itemName":"pikaqiu",
# 		"itemType":"toy",
# 		"itemCount":"5",
# 		"owner":"Iris",
# 		"itemCompany":"Tencent",
# 		"itemInfo":"this is test item",
# 		"itemImages":"itemImages"
# }')
# createItemIds=$(echo $createItemIds | jq ".itemIDS" | sed "s/\"//g")
# echo $createItemIds
# 后面的itemID可以从这个返回值里取

itemID="5ae9b606dc20311d3cb20d4d"
echo "POST request startIssueProductByID  ..."
echo
curl -s -X POST \
  http://localhost:4000/startIssueProductByID \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d "{
		\"username\":\"Iris\",
		\"userType\":\"0\",
		\"itemID\":\"$itemID\"

}"
echo
echo "POST request getIssueProductByID  ..."
echo
curl -s -X POST \
  http://localhost:4000/getIssueProductByID \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d "{
		\"username\":\"xiaoxu\",
		\"userType\":\"1\",
		\"itemID\":\"$itemID\"

}"
echo
echo "POST request startSellProductByID  ..."
echo
curl -s -X POST \
  http://localhost:4000/startSellProductByID \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json" \
  -d "{
		\"username\":\"xiaoxu\",
		\"userType\":\"1\",
		\"itemID\":\"$itemID\",
		\"itemPrice\":\"11\"
}"
echo
# echo
# echo "POST request stopSellProductByID  ..."
# echo
# curl -s -X POST \
#   http://localhost:4000/stopSellProductByID \
#   -H "authorization: Bearer $ORG2_TOKEN" \
#   -H "content-type: application/json" \
#   -d "{
# 		\"username\":\"xiaoxu\",
# 		\"userType\":\"1\",
# 		\"itemID\":\"$itemID\"
# }"
echo
echo "POST request buyProductByID  ..."
echo
curl -s -X POST \
  http://localhost:4000/buyProductByID \
  -H "authorization: Bearer $BUYER_TOKEN" \
  -H "content-type: application/json" \
  -d "{
		\"username\":\"jingjing\",
		\"userType\":\"1\",
		\"itemID\":\"$itemID\"
}"
echo
echo "POST request confirmSellProductByID  ..."
echo
curl -s -X POST \
  http://localhost:4000/confirmSellProductByID \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json" \
  -d "{
		\"username\":\"xiaoxu\",
		\"userType\":\"1\",
		\"itemID\":\"$itemID\",
		\"confirm\":true
}"
echo
echo "POST request approveSellProductByID  ..."
echo
curl -s -X POST \
  http://localhost:4000/approveSellProductByID \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d "{
		\"username\":\"Tencent\",
		\"userType\":\"0\",
		\"itemID\":\"$itemID\",
		\"approve\":false
}"
echo
echo "POST request getProductsOnsell  ..."
curl -s -X POST \
  http://localhost:4000/getProductsOnsell \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d "{
		\"username\":\"Iris\",
		\"userType\":\"0\"
}"
echo
echo
echo "POST request getProductsByCompanyAndStatus  ..."
curl -s -X POST \
  http://localhost:4000/getProductsByCompanyAndStatus \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d "{
		\"username\":\"Tencent\",
		\"userType\":\"0\",
		\"itemStatus\":\"0\"
}"
echo
