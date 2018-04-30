/*
Copyright Tongji University. 2018 All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

		 http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

var logger = shim.NewLogger("gameAssetandUser")

// GameAssetChaincode Chaincode implementation
type GameAssetChaincode struct {
}

//information for gameAsset
type GameAsset struct {
	AssetID         string    `json:"AssetID"`
	Type            string    `json:"Type"`
	Number          uint64    `json:"Number"`
	GameCompany     string    `json:"GameCompany"`
	GameName        string    `json:"GameName"`
	ReleaseTime     time.Time `json:"ReleaseTime"`
	Owner           string    `json:"Owner"`
	AssetInfo       string    `json:"AssetInfo"`
	TransactionInfo string    `json:"TransactionInfo"`
}

//information for User
type User struct {
	UserID          string   `json:"UserID"`
	Name            string   `json:"Name"`
	Email           string   `json:"Email"`
	Balance         float64  `json:"Balance"`
	AssetList       []string `json:"AssetList"`
	AssetForSale    []string `json:"AssetForSale"`
	TransactionInfo string   `json:"TransactionInfo"`
}

func (t *GameAssetChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	logger.Info("########### GameAssetChaincode Init ###########")

	return shim.Success(nil)

}

// some functions
func (t *GameAssetChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	logger.Info("########### GameAssetChaincode Invoke ###########")

	function, args := stub.GetFunctionAndParameters()

	//游戏资产类函数
	if function == "generateAsset" {
		return t.generateAsset(stub, args)
	}

	if function == "getGameAssetInfo" {
		return t.getGameAssetInfo(stub, args)
	}

	if function == "changeGameAssetOwner" {
		return t.changeGameAssetOwner(stub, args)
	}

	if function == "deleteGameAsset" {
		return t.deleteGameAsset(stub, args)
	}

	//用户信息类函数
	if function == "generateUser" {
		return t.generateUser(stub, args)
	}

	if function == "getUserInfo" {
		return t.getUserInfo(stub, args)
	}

	if function == "changeUser" {
		return t.changeUser(stub, args)
	}

	logger.Errorf("Unknown action, check the first argument, got: %v", args[0])
	return shim.Error(fmt.Sprintf("Unknown action, check the first argument, got: %v", args[0]))
}

// 游戏资产发行的时候进行初始化
// 输入参数一个：json化的GameAsset
// 输出：执行状态
func (t *GameAssetChaincode) generateAsset(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	var err error

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1.")
	}
	//从参数中获取初始化信息
	var InitGameAssetObj GameAsset
	InitGameAssetInfo := args[0]
	err = json.Unmarshal([]byte(InitGameAssetInfo), &InitGameAssetObj)
	if err != nil {
		return shim.Error(err.Error())
	}

	//判断资产ID是否唯一
	AssetID := InitGameAssetObj.AssetID
	GameAssetInfo, _ := stub.GetState(AssetID)
	if GameAssetInfo != nil {
		return shim.Error("the GameAsset is existed")
	}

	//记录资产交易时间
	timestamp, _ := stub.GetTxTimestamp()
	ReleaseTime := time.Unix(timestamp.Seconds, int64(timestamp.Nanos))
	InitGameAssetObj.ReleaseTime = ReleaseTime

	//检查更改完成之后上链
	//key：读出来的AssetID，value:检查过的结构体
	jsonAsBytes, _ := json.Marshal(InitGameAssetObj)
	err = stub.PutState(AssetID, []byte(jsonAsBytes))
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}

// 更改一个游戏资产的所有权
//输入：GameAsse.AssetID，newOwner，TransactionInfo
//输出：执行状态
func (t *GameAssetChaincode) changeGameAssetOwner(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error

	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}

	AssetID := args[0]
	NewOwner := args[1]
	TransactionInfo := args[2]

	//检查传入的AssetID是否正确
	Assetbytes, err := stub.GetState(AssetID)
	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get state for " + AssetID + "\"}"
		return shim.Error(jsonResp)
	}

	if Assetbytes == nil {
		jsonResp := "{\"Error\":\"Nil amount for " + AssetID + "\"}"
		return shim.Error(jsonResp)
	}

	//解析对象并更改信息，TransactionInfo以追加形式添加,并且重新上链
	var GameAssetObj GameAsset
	err = json.Unmarshal([]byte(Assetbytes), &GameAssetObj)
	if err != nil {
		return shim.Error(err.Error())
	}

	GameAssetObj.Owner = NewOwner
	//采用‘ + ’作为解析的分隔符
	NewTransactionInfo := GameAssetObj.TransactionInfo + " + " + TransactionInfo
	GameAssetObj.TransactionInfo = NewTransactionInfo

	jsonAsBytes, _ := json.Marshal(GameAssetObj)
	err = stub.PutState(AssetID, []byte(jsonAsBytes))
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}

//查询资产信息
//输入参数一个：AssetID
//输出：查询到的结构体
func (t *GameAssetChaincode) getGameAssetInfo(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	var err error

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting name of the person to query")
	}

	AssetID := args[0]

	Avalbytes, err := stub.GetState(AssetID)
	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get state for " + AssetID + "\"}"
		return shim.Error(jsonResp)
	}

	if Avalbytes == nil {
		jsonResp := "{\"Error\":\"Nil amount for " + AssetID + "\"}"
		return shim.Error(jsonResp)
	}

	jsonResp := "{\"Name\":\"" + AssetID + "\",\"Amount\":\"" + string(Avalbytes) + "\"}"
	logger.Infof("Query Response:%s\n", jsonResp)
	return shim.Success(Avalbytes)
}

// 删除一个GameAsset
//输入：GameAsse.AssetID
//输出：执行状态
func (t *GameAssetChaincode) deleteGameAsset(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	AssetID := args[0]

	// Delete the key from the state in ledger
	err := stub.DelState(AssetID)
	if err != nil {
		return shim.Error("Failed to delete state")
	}

	return shim.Success(nil)
}

//#########################################################处理用户信息的函数###########################################################
// 用户注册的时候进行初始化
// 输入参数一个：json化的User
// 输出：执行状态
func (t *GameAssetChaincode) generateUser(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	var err error

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1.")
	}
	//从参数中获取初始化信息
	var InitUserObj User
	InitUserInfo := args[0]
	err = json.Unmarshal([]byte(InitUserInfo), &InitUserObj)
	if err != nil {
		return shim.Error(err.Error())
	}

	//判断资产ID是否唯一
	UserID := InitUserObj.UserID
	UserInfo, _ := stub.GetState(UserID)
	if UserInfo != nil {
		return shim.Error("the User is existed")
	}

	//检查更改完成之后上链
	//key：读出来的AssetID，value:检查过的结构体
	jsonAsBytes, _ := json.Marshal(InitUserObj)
	err = stub.PutState(UserID, []byte(jsonAsBytes))
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}

//查询资产信息
//输入参数一个：UserID
//输出：查询到的结构体
func (t *GameAssetChaincode) getUserInfo(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	var err error

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting name of the person to query")
	}

	UserID := args[0]

	Avalbytes, err := stub.GetState(UserID)
	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get state for " + UserID + "\"}"
		return shim.Error(jsonResp)
	}

	if Avalbytes == nil {
		jsonResp := "{\"Error\":\"Nil amount for " + UserID + "\"}"
		return shim.Error(jsonResp)
	}

	jsonResp := "{\"Name\":\"" + UserID + "\",\"Amount\":\"" + string(Avalbytes) + "\"}"
	logger.Infof("Query Response:%s\n", jsonResp)
	return shim.Success(Avalbytes)
}

// 更改一个用户的信息
//输入：UserID，flag(结构体的属性), newObj
//输出：执行状态
func (t *GameAssetChaincode) changeUser(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error

	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}

	UserID := args[0]
	Flag := args[1]
	NewObj := args[2]

	//检查传入的UseID是否正确
	Assetbytes, err := stub.GetState(UserID)
	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get state for " + UserID + "\"}"
		return shim.Error(jsonResp)
	}

	if Assetbytes == nil {
		jsonResp := "{\"Error\":\"Nil amount for " + UserID + "\"}"
		return shim.Error(jsonResp)
	}

	//检查传入的flag是否正确
	FlagArray := []string{"Name", "Email", "Balance", "addAssetList", "deleteAssetList", "addAssetForSale", "deleteAssetForSale"}
	FlagBool := true
	for _, val := range FlagArray {
		if Flag == val {
			FlagBool = false
		}
	}

	if FlagBool {
		logger.Errorf("Unknown changeUser:Flag, check the second argument, got: %v", args[1])
		return shim.Error(fmt.Sprintf("Unknown changeUser:Flag, check the second argument, got: %v", args[1]))
	}

	//解析对象并更改信息，TransactionInfo以追加形式添加,并且重新上链
	var UserObj User
	err = json.Unmarshal([]byte(Assetbytes), &UserObj)
	if err != nil {
		return shim.Error(err.Error())
	}

	if Flag == "Name" {
		UserObj.Name = NewObj
	}
	if Flag == "Email" {
		UserObj.Email = NewObj
	}
	if Flag == "Balance" {
		NewObj, err := strconv.ParseFloat(NewObj, 64)
		if err != nil {
			logger.Errorf("Balance is not a float, check the Third argument, got: %v", args[2])
		}
		UserObj.Balance = NewObj
	}
	if Flag == "addAssetList" {
		UserObj.AssetList = append(UserObj.AssetList, NewObj)
	}
	if Flag == "deleteAssetList" {
		UserObj.AssetList = removeFromStringSlice(UserObj.AssetList, NewObj)
	}
	if Flag == "addAssetForSale" {
		UserObj.AssetForSale = append(UserObj.AssetForSale, NewObj)
	}
	if Flag == "deleteAssetForSale" {
		UserObj.AssetForSale = removeFromStringSlice(UserObj.AssetForSale, NewObj)
	}

	jsonAsBytes, _ := json.Marshal(UserObj)
	err = stub.PutState(UserID, []byte(jsonAsBytes))
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}

//从一个字符串切片中移除某个字符串,返回处理后的字符串，若没有该字符串，则原样返回
//输入：需要处理的字符串切片和删除的字符串，输出处理之后的字符串
func removeFromStringSlice(s []string, elem string) []string {
	for index, val := range s {
		if val == elem {
			s = append(s[:index], s[index+1:]...)
		}
	}
	return s
}

func main() {
	err := shim.Start(new(GameAssetChaincode))
	if err != nil {
		logger.Errorf("Error starting Simple chaincode: %s", err)
	}
}
