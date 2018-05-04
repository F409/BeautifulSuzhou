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
  http://localhost:4000/api/login \
  -H "content-type: application/json" \
  -d '{
		"username":"xiaoxu",
		"password":"1234"
		 }')
echo $response4
response5=$(curl -s -X POST \
  http://localhost:4000/api/login \
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
  http://localhost:4000/api/login \
  -H "content-type: application/json" \
  -d '{
		"username":"jingjing",
		"password":"1234"
		 }')
echo $response6
BUYER_TOKEN=$(echo $response6 | jq ".token" | sed "s/\"//g")
echo $BUYER_TOKEN
# echo "POST request Create new Item  ...生成新道具"
# echo
# createItemIds=$(curl -s -X POST \
#   http://localhost:4000/api/createItem \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 		"username":"Iris",
# 		"userType":"0",
# 		"itemName":"pikaqiu",
# 		"itemType":"toy",
# 		"itemCount":"1",
# 		"owner":"Iris",
# 		"itemCompany":"Tencent",
# 		"itemInfo":"this is test item",
# 		"itemImages":"itemImages"
# }')
# # createItemIds=$(echo $createItemIds | jq ".itemIDS" | sed "s/\"//g")
# echo $createItemIds
# 后面的itemID可以从这个返回值里取
echo
echo
echo "POST request getProductsByCompany  ...根据厂商获取道具列表"
curl -s -X POST \
  http://localhost:4000/api/getProductsByCompany \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d "{
		\"username\":\"Tencent\",
		\"userType\":\"0\"
}"
echo
itemID="5aec24f513b2ae2575186302"
# itemID2="5aea83395ab0982998937eec"
echo "POST request startIssueProductByID  ...游戏公司将生成的道具发行"
echo
curl -s -X POST \
  http://localhost:4000/api/startIssueProductByID \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d "{
		\"username\":\"Iris\",
		\"userType\":\"0\",
		\"itemID\":\"$itemID\"

}"
#
echo
echo "GET query chaincode:getGameAssetInfo on peer1 of Org1"
echo
curl -s -X GET \
  "http://localhost:4000/api/channels/mychannel/chaincodes/mycc?peer=peer0.org1.example.com&fcn=getGameAssetInfo&args=%5b%225aec24f513b2ae2575186302%22%5d" \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json"
echo

echo
echo "POST request getIssueProductByID  ...用户从厂商得到道具或者说厂商发道具"
echo
curl -s -X POST \
  http://localhost:4000/api/getIssueProductByID \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json" \
  -d "{
		\"username\":\"xiaoxu\",
		\"userType\":\"1\",
		\"itemID\":\"$itemID\"

}"
echo
echo
echo "GET query chaincode:getGameAssetInfo on peer1 of Org1"
echo
curl -s -X GET \
  "http://localhost:4000/api/channels/mychannel/chaincodes/mycc?peer=peer0.org1.example.com&fcn=getGameAssetInfo&args=%5b%225aec24f513b2ae2575186302%22%5d" \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json"
echo

# echo
# echo "POST request getProductsByCompany  ...根据厂商获取道具列表"
# curl -s -X POST \
#   http://localhost:4000/api/getProductsByCompany \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d "{
# 		\"username\":\"Tencent\",
# 		\"userType\":\"0\"
# }"
# echo
# echo
# echo "POST request getProductsByOwnerAndStatus  ...根据状态和拥有者获取道具列表"
# curl -s -X POST \
#   http://localhost:4000/api/getProductsByOwnerAndStatus \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d "{
# 		\"username\":\"Iris\",
# 		\"userType\":\"0\",
# 		\"itemStatus\":\"0\"
# }"
# echo
# echo
# echo "POST request getProductsByOwnerAndStatusAnditemCompany  ...根据状态和拥有者,厂商获取道具列表"
# curl -s -X POST \
#   http://localhost:4000/api/getProductsByOwnerAndStatusAnditemCompany \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d "{
# 		\"username\":\"Iris\",
# 		\"userType\":\"0\",
# 		\"itemStatus\":\"0\",
# 		\"itemCompany\":\"Tencent\"
# }"

echo "POST request startSellProductByID  ...提交出售申请"
echo
curl -s -X POST \
  http://localhost:4000/api/startSellProductByID \
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
# echo "POST request stopSellProductByID  ...停止出售请求"
# echo
# curl -s -X POST \
#   http://localhost:4000/api/stopSellProductByID \
#   -H "authorization: Bearer $ORG2_TOKEN" \
#   -H "content-type: application/json" \
#   -d "{
# 		\"username\":\"xiaoxu\",
# 		\"userType\":\"1\",
# 		\"itemID\":\"$itemID\"
# }"
echo
echo "POST request buyProductByID  ...提交购买请求"
echo
curl -s -X POST \
  http://localhost:4000/api/buyProductByID \
  -H "authorization: Bearer $BUYER_TOKEN" \
  -H "content-type: application/json" \
  -d "{
		\"username\":\"jingjing\",
		\"userType\":\"1\",
		\"itemID\":\"$itemID\"
}"
echo
echo "POST request confirmSellProductByID  ...确认他人购买请求"
echo
curl -s -X POST \
  http://localhost:4000/api/confirmSellProductByID \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json" \
  -d "{
		\"username\":\"xiaoxu\",
		\"userType\":\"1\",
		\"itemID\":\"$itemID\",
		\"confirm\":true
}"
echo
echo "POST request approveSellProductByID  ...批准玩家购买请求"
echo
curl -s -X POST \
  http://localhost:4000/api/approveSellProductByID \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d "{
		\"username\":\"Tencent\",
		\"userType\":\"0\",
		\"itemID\":\"$itemID\",
		\"approve\":true
}"
echo
echo "GET query chaincode:getGameAssetInfo on peer1 of Org1"
echo
curl -s -X GET \
  "http://localhost:4000/api/channels/mychannel/chaincodes/mycc?peer=peer0.org1.example.com&fcn=getGameAssetInfo&args=%5b%225aec24f513b2ae2575186302%22%5d" \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json"
echo
echo "POST request giveProductByID  ... 用户游戏中直接交易道具(页面待实现)"
echo
curl -s -X POST \
  http://localhost:4000/api/giveProductByID \
  -H "authorization: Bearer $BUYER_TOKEN" \
  -H "content-type: application/json" \
  -d "{
		\"username\":\"jingjing\",
		\"userType\":\"1\",
		\"itemID\":\"$itemID\",
		\"to\":\"xiaoxu\"
}"
echo
curl -s -X GET \
  "http://localhost:4000/api/channels/mychannel/chaincodes/mycc?peer=peer0.org1.example.com&fcn=getGameAssetInfo&args=%5b%225aec24f513b2ae2575186302%22%5d" \
  -H "authorization: Bearer $BUYER_TOKEN" \
  -H "content-type: application/json"
echo
#############################以上是上链部分测试，注意要用新的itemID替换原来的进行测试###################
################################################################################################
# echo "POST request getProductsOnsell  ...获得所有正在交易市场的道具列表"
# curl -s -X POST \
#   http://localhost:4000/api/getProductsOnsell \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d "{
# 		\"username\":\"Iris\",
# 		\"userType\":\"0\"
# }"
# echo
# echo
# echo "POST request getProductsByCompanyAndStatus  ...根据状态和厂商获取道具列表"
# curl -s -X POST \
#   http://localhost:4000/api/getProductsByCompanyAndStatus \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d "{
# 		\"username\":\"Tencent\",
# 		\"userType\":\"0\",
# 		\"itemStatus\":\"0\"
# }"
# echo
# echo
# echo "POST request getProductByID  ...根据道具ID获取道具"
# curl -s -X POST \
#   http://localhost:4000/api/getProductByID \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d "{
# 		\"username\":\"Tencent\",
# 		\"userType\":\"0\",
# 		\"itemID\":\"$itemID\"
# }"
# echo
# echo
# echo "POST request getProductsByOwner  ...根据用户获取道具列表"
# curl -s -X POST \
#   http://localhost:4000/api/getProductsByOwner \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d "{
# 		\"username\":\"Iris\",
# 		\"userType\":\"0\"
# }"
# echo
