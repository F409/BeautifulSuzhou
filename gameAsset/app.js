/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger('SampleWebApp');
var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var util = require('util');
var app = express();
var expressJWT = require('express-jwt');
var jwt = require('jsonwebtoken');
var bearerToken = require('express-bearer-token');
var cors = require('cors');
const md5 = require('./routes/md5.js')
const db = require('./routes/db.js')
var ObjectId = require('mongodb').ObjectId;
require('./config.js');
var hfc = require('fabric-client');
var path = require('path');

var helper = require('./app/helper.js');
var createChannel = require('./app/create-channel.js');
var join = require('./app/join-channel.js');
var install = require('./app/install-chaincode.js');
var instantiate = require('./app/instantiate-chaincode.js');
var invoke = require('./app/invoke-transaction.js');
var query = require('./app/query.js');
var host = process.env.HOST || hfc.getConfigSetting('host');
var port = process.env.PORT || hfc.getConfigSetting('port');
var userType={
	"Org1":"0",
	"Org2":"1"
}
var GameAssetByItem={
	"AssetID":"_id",
	"Type":"itemType",
	"Number":"itemCount",
	"GameCompany":"itemCompany",
	"GameName":"itemName",
	"ReleaseTime":"2017-11-25T08:31:01.956Z",
	"Owner":"owner",
	"AssetInfo":"itemInfo",
	"TransactionInfo":"itemHistory"
}
var clone = function(a){return JSON.parse(JSON.stringify(a));}
var ObjectId = require('mongodb').ObjectID
///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// SET CONFIGURATONS ////////////////////////////
///////////////////////////////////////////////////////////////////////////////
app.options('*', cors());
app.use(cors());
//support parsing of application/json type post data
app.use(bodyParser.json());
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
	extended: false
}));
// set secret variable
app.set('secret', 'thisismysecret');
app.use('/api',expressJWT({
	secret: 'thisismysecret'
}).unless({
	path: ['/api/addUser','/api/users','/api/login']
}));
app.use(bearerToken());
app.use(function(req, res, next) {
	logger.debug(' ------>>>>>> new request for %s',req.originalUrl);
	if (!(req.originalUrl.indexOf('/api') >= 0)) {
	return next();
  }
	if (req.originalUrl.indexOf('/api/users') >= 0) {
		return next();
	}
	if (req.originalUrl.indexOf('/api/addUser') >= 0) {
		return next();
	}
	if (req.originalUrl.indexOf('/api/login') >= 0) {
		return next();
	}
	var token = req.token;
	jwt.verify(token, app.get('secret'), function(err, decoded) {
		if (err) {
			res.send({
				success: false,
				message: 'Failed to authenticate token. Make sure to include the ' +
					'token returned from /api/login call in the authorization header ' +
					' as a Bearer token'
			});
			return;
		} else {
			// add the decoded user name and org name to the request object
			// for the downstream code to use
			req.username = decoded.username;
			req.orgName = decoded.orgName;
			req.UserID = decoded.UserID;
			logger.debug(util.format('Decoded from JWT token: username - %s, orgName - %s', decoded.username, decoded.orgName));
			return next();
		}
	});
});
app.use(express.static(path.join(__dirname, 'public')));
///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// START SERVER /////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
var server = http.createServer(app).listen(port, function() {});
logger.info('****************** SERVER STARTED ************************');
logger.info('***************  http://%s:%s  ******************',host,port);
server.timeout = 240000;

function getErrorMessage(field) {
	var response = {
		success: false,
		message: field + ' field is missing or Invalid in the request'
	};
	return response;
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////// REST ENDPOINTS START HERE ///////////////////////////
///////////////////////////////////////////////////////////////////////////////
// Register and enroll user区块链安装链码以及初始化
app.post('/api/Users', async function(req, res) {
	var username = req.body.username;
	var orgName = req.body.orgName;
	logger.debug('End point : /api/users');
	logger.debug('User name : ' + username);
	logger.debug('Org name  : ' + orgName);
	if (!username) {
		res.json(getErrorMessage('\'username\''));
		return;
	}
	if (!orgName) {
		res.json(getErrorMessage('\'orgName\''));
		return;
	}
	var token = jwt.sign({
		exp: Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime')),
		username: username,
		orgName: orgName
	}, app.get('secret'));
	let response = await helper.getRegisteredUser(username, orgName, true);
	logger.debug('-- returned from registering the username %s for organization %s',username,orgName);
	if (response && typeof response !== 'string') {
		logger.debug('Successfully registered the username %s for organization %s',username,orgName);
		response.token = token;
		res.json(response);
	} else {
		logger.debug('Failed to register the username %s for organization %s with::%s',username,orgName,response);
		res.json({success: false, message: response});
	}
	});
// Register and enroll user往mongodb和区块链上写数据
app.post('/api/addUser', async function(req, res) {
	logger.debug(req.body)
	var username = req.body.username;
	var orgName = req.body.orgName;
	logger.debug('End point : /api/users');
	logger.debug('User name : ' + username);
	logger.debug('Org name  : ' + orgName);
	if (!username) {
		res.json(getErrorMessage('\'username\''));
		return;
	}
	if (!orgName) {
		res.json(getErrorMessage('\'orgName\''));
		return;
	}

	let response = await helper.getRegisteredUser(username, orgName, true);
	logger.debug('-- returned from registering the username %s for organization %s',username,orgName);
	if (response && typeof response !== 'string') {
		logger.debug('Successfully registered the username %s for organization %s',username,orgName);
	} else {
		logger.debug('Failed to register the username %s for organization %s with::%s',username,orgName,response);
		res.json({success: false, message: response});
	}
	var peers = req.body.peers;
	var chaincodeName = req.body.chaincodeName;
	var channelName = req.body.channelName;
	var fcn = req.body.fcn;
	var args =new Array([]);
	// 根据用户名查询数据库中是否含有该用
	await db.findOne('myuser', { "Name": username }, async function (err, result) {
		if (err) {
			return res.json({
				"success": false,
				"message": "内部服务器错误"
			})
		}
		if (!result || result.length === 0) {
			var userData = {
				"Name":username,
				"orgName":orgName,
				"Password":md5(req.body.Password),
				"Email": req.body.Email,
				"Balance":req.body.Balance,
				"AssetList":req.body.AssetList,
				"AssetForSale":req.body.AssetForSale,
				"TransactionInfo":req.body.TransactionInfo
			};
			// 插入到数据库
			await db.insertOne('myuser', userData,async function (err, result) {
					if (err) {
						return res.json({
							"code": 401,
							"message": "user新增失败"
						})
					}

					let blockUser ={
						"UserID":result[0]._id,
						"Name":username,
						"Email": req.body.Email,
						"Balance":req.body.Balance,
						"AssetList":req.body.AssetList,
						"AssetForSale":req.body.AssetForSale,
						"TransactionInfo":req.body.TransactionInfo
					}
					args[0] = JSON.stringify(blockUser);
					logger.debug('channelName  : ' + channelName);
					logger.debug('chaincodeName : ' + chaincodeName);
					logger.debug('fcn  : ' + fcn);
					logger.debug('args  : ' + args[0].UserID);
					let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, username, orgName);
					return res.json({
						"success":true,
						"message":result[0],
						"blockMessage":message
					});
				})
		}else{
			return res.json({
				"success":false,
				"message":"用户已经存在了:"+username
			});
		}

	})

});
// (1 登录)
app.post('/api/login', async function(req, res) {
	var username = req.body.username;
	var password = md5(req.body.password);
	logger.debug('End point : /api/login');
	logger.debug('User name : ' + username)
	if (!username) {
		res.json({
			"success": false,
			"message": "请输入用户名"
		});
		return;
	}
	if (!password) {
		res.json({
			"success": false,
			"message": "请输入密码"}

		);
		return;
	}
	// 根据用户名查询数据库中是否含有该用
	await db.findOne('myuser', { "Name": username }, function (err, result) {
		if (err) {
			return res.json({
				"success": false,
				"message": "内部服务器错误"
			})
		}
		if (!result || result.length === 0) {
			return res.json({
				"success": false,
				"message": "找不到用户名"
			})
		}
		var dbPassword = result.Password
		var UserID = result._id
		var orgName = result.orgName
		var balance = result.Balance+""
		if (dbPassword === password) {
			var token = jwt.sign({
				exp: Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime')),
				username: username,
				orgName: orgName,
				UserID: UserID
			}, app.get('secret'));
			logger.debug(username+"登录成功");
			return res.json({
				"success": true,
				"username": username,
				"userType":userType[orgName],
				"balance":balance,
				"token": token
			})
		} else {
			return res.json({
				"success": false,
				"message": "密码错误"
			})
		}
	})

});
// 2 获得所有正在交易市场的道具列表
app.post('/api/getProductsOnsell', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< getProductsOnsell>>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/getProductsOnsell');
	let query = {"itemStatus":"2"};
	await db.find('gameAsset',query,async　function (err, result) {
		if (err) {
			logger.debug('查询道具失败: ' + err);
			return res.json({
				"success": false,
				"message": "查询道具失败"
			})
		}
		await logger.debug("查询道具成功"+result);
		return res.json({
			"success": true,
			"message": "查询道具成功",
			"data":result
		})
	})

})
// 3 根据状态和拥有者获取道具列表
app.post('/api/getProductsByOwnerAndStatus', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< getProductsByOwnerAndStatus>>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/getProductsByOwnerAndStatus');
	let itemStatus = req.body.itemStatus
	let owner = req.body.username
	let query = {"itemStatus":itemStatus,"owner":owner}
	await db.find('gameAsset',query,async　function (err, result) {
		if (err) {
			logger.debug('查询道具失败: ' + err);
			return res.json({
				"success": false,
				"message": "查询道具失败"
			})
		}
		await logger.debug("查询道具成功"+result);
		return res.json({
			"success": true,
			"message": "查询道具成功",
			"data":result
		})
	})
})
// 3 根据状态和拥有者，厂商获取道具列表
app.post('/api/getProductsByOwnerAndStatusAnditemCompany', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< getProductsByOwnerAndStatusAnditemCompany>>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/getProductsByOwnerAndStatusAnditemCompany');
	let itemStatus = req.body.itemStatus
	let owner = req.body.username
	let itemCompany = req.body.itemCompany
	let query = {"itemStatus":itemStatus,"owner":owner,"itemCompany":itemCompany}
	await db.find('gameAsset',query,async　function (err, result) {
		if (err) {
			logger.debug('查询道具失败: ' + err);
			return res.json({
				"success": false,
				"message": "查询道具失败"
			})
		}
		await logger.debug("查询道具成功"+result);
		return res.json({
			"success": true,
			"message": "查询道具成功",
			"data":result
		})
	})
})
// 3 根据状态和厂商获取道具列表
app.post('/api/getProductsByCompanyAndStatus', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< getProductsByCompanyAndStatus>>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/getProductsByCompanyAndStatus');
	let itemStatus = req.body.itemStatus
	let itemCompany = req.body.username
	let query = {"itemStatus":itemStatus,"itemCompany":itemCompany}
	await db.find('gameAsset',query,async　function (err, result) {
		if (err) {
			logger.debug('查询道具失败: ' + err);
			return res.json({
				"success": false,
				"message": "查询道具失败"
			})
		}
		await logger.debug("查询道具成功"+result);
		return res.json({
			"success": true,
			"message": "查询道具成功",
			"data":result
		})
	})
})
// 4 根据道具ID获取道具
app.post('/api/getProductByID', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< getProductByID>>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/getProductByID');
	let itemID = req.body.itemID
	let query = {"_id":ObjectId(itemID)}
	await db.find('gameAsset',query,async　function (err, result) {
		if (err) {
			logger.debug('查询道具失败: ' + err);
			return res.json({
				"success": false,
				"message": "查询道具失败"
			})
		}
		await logger.debug("查询道具成功"+result);
		return res.json({
			"success": true,
			"message": "查询道具成功",
			"data":result[0]
		})
	})
})
// 6 根据用户获取道具列表
app.post('/api/getProductsByOwner', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< getProductsByOwner>>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/getProductsByOwner');
	let owner = req.username
	let query = {"owner":owner}
	await db.find('gameAsset',query,async　function (err, result) {
		if (err) {
			logger.debug('查询道具失败: ' + err);
			return res.json({
				"success": false,
				"message": "查询道具失败"
			})
		}
		await logger.debug("查询道具成功"+result);
		return res.json({
			"success": true,
			"message": "查询道具成功",
			"data":result
		})
	})
})
// 6 根据厂商获取道具列表
app.post('/api/getProductsByCompany', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< getProductsByCompany>>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/getProductsByCompany');
	let itemCompany = req.body.username
	let query = {"itemCompany":itemCompany}
	await db.find('gameAsset',query,async　function (err, result) {
		if (err) {
			logger.debug('查询道具失败: ' + err);
			return res.json({
				"success": false,
				"message": "查询道具失败"
			})
		}
		await logger.debug("查询道具成功"+result);
		return res.json({
			"success": true,
			"message": "查询道具成功",
			"data":result
		})
	})
})
// 14 用户游戏中直接交易道具(页面待实现)
app.post('/api/giveProductByID', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< getProductsByOwner>>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/getProductsByOwner');
	var buyer = req.body.to
	var owner = req.username
	var oldItem = {"_id":ObjectId(req.body.itemID),"itemStatus":"1","owner":owner};
	await db.findOne('gameAsset', oldItem, async function (err, result) {
					if (err) {
						return res.json({
							"success": false,
							"message": "内部服务器错误"
						})
					}
					if (!result || result.length === 0) {
						return res.json({
							"success": false,
							"message": "找不到符合条件的道具"
						})
					}
					var itemHistory = result.itemHistory
					var createdTime = (new Date()).toLocaleString();
					var transaction = createdTime + " "+owner+" to "+buyer
					itemHistory.push(transaction)
					var newItem = {"owner":buyer,"itemHistory":itemHistory};
					//上链代码
					var peers = ["peer0.org2.example.com","peer1.org2.example.com"];
					var chaincodeName = "mycc";
					var channelName = "mychannel";
					var fcn = "changeGameAssetOwner";
					var args = [req.body.itemID,buyer,transaction]
					await db.updateMany('gameAsset',oldItem,newItem,async function (err, result) {
						if (err) {
							logger.debug('直接转让道具失败: ' + err);
							return res.json({
								"success": false,
								"message": "直接转让道具失败"
							})
						}
						logger.debug(result)
						if(result.n==0){
							logger.debug('直接转让道具失败: ' + result);
							return res.json({
								"success": false,
								"message": "不存在符合条件的道具"
							})
						}
						else{
							let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, req.username, req.orgName);
							return res.json({
								"success": true,
								"message": "直接转让道具成功",
								"blockMessage":message
							})
						}
					})
				})
})
// (12生成新道具)游戏公司生成道具
app.post('/api/createItem', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< C R E A T E  NEW ITEM>>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/createItem');
	if (userType[req.orgName]=="1") {
		res.json({
				"success": false,
				"message": "wrong userType:"+userType[req.orgName]
		});
		return;
	}
	let itemName=req.body.itemName
	let itemType=req.body.itemType
	let itemCount=req.body.itemCount
	let owner=req.body.owner
	let itemCompany=req.body.itemCompany
	let itemInfo=req.body.itemInfo
	let itemImages=req.body.itemImages
	var createdTime =(new Date()).toLocaleString();
	var history = createdTime+" "+"born in "+itemCompany
	var itemHistory=new Array([])
	itemHistory[0] = history
	logger.debug('history: ' + history);
	var item = {
		"itemName":itemName,
		"itemType":itemType,
		"itemCount":itemCount,
		"owner":owner,
		"buyer":"",
		"itemCompany":itemCompany,
		"itemInfo":itemInfo,
		"itemImages":itemImages,
		"itemPrice":"",
		"itemHistory":itemHistory,
		"itemStatus":"0"
	}
	var ItemsNumber = parseInt(itemCount)
	var createItems=new Array([])
	for (var i = 0; i < ItemsNumber; i++) {
		(function (i) {
			createItems[i] = clone(item)
		})(i);
	}
	await db.insertMany('gameAsset',createItems,function (err, result) {
		if (err) {
			logger.debug('生成道具失败: ' + err);
			return res.json({
				"success": false,
				"message": "生成道具失败"
			})
		}
		var createItemsId = result.insertedIds
		logger.debug('生成道具的id列表' + createItemsId);
		return res.json({
			"success": true,
			"message": "生成道具成功",
			"itemIDS":createItemsId
		})
	})
});
// (10 提交发行请求)游戏公司将生成的道具发行
app.post('/api/startIssueProductByID', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< start Issue Product By ID>>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/startIssueProductByID');
	if (userType[req.orgName]=="1") {
		res.json({
				"success": false,
				"message": "wrong userType:"+userType[req.orgName]
		});
		return;
	};
	logger.debug("req.body.itemID="+req.body.itemID)
	// var oldItem = {"_id":ObjectId(req.body.itemID),"itemStatus":"0"};
	var oldItem = {"_id":ObjectId(req.body.itemID)};
	var newItem = {"itemStatus":"5"};
	await db.findOne('gameAsset',oldItem,async function(err,result){
		if (err) {
			logger.debug('服务器错误: ' + err);
			return res.json({
				"success": false,
				"message": "服务器错误"
			})
		}
		if (!result || result.length === 0) {
			return res.json({
				"success": false,
				"message": "找不到该道具"
			})
		}
		// var itemHistory = result.itemHistory
		var blockItem = {
			"AssetID":result._id,
			"Type":result.itemType,
			"Number":parseInt(result.itemCount),
			"GameCompany":result.itemCompany,
			"GameName":result.itemName,
			"ReleaseTime":"2017-11-25T08:31:01.956Z",
			"Owner":result.owner,
			"AssetInfo":result.itemInfo,
			"TransactionInfo":result.itemHistory
		}
		var peers = ["peer0.org1.example.com","peer1.org1.example.com"];
		var chaincodeName = "mycc";
		var channelName = "mychannel";
		var fcn = "generateAsset";
		var args =new Array([]);
		args[0] = JSON.stringify(blockItem);

		await db.updateMany('gameAsset',oldItem,newItem,async function (err, result) {
			if (err) {
				logger.debug('发行道具失败: ' + err);
				return res.json({
					"success": false,
					"message": "发行道具失败"
				})
			}
			logger.debug(result)
			if(result.n==0){
				logger.debug('发行道具失败: ' + result);
				return res.json({
					"success": false,
					"message": "不存在符合条件的道具"
				})
			}
			else{
				let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, req.username, req.orgName);
				return res.json({
					"success": true,
					"message": "发行道具成功",
					"blockMessage":message
				})
			}
		})
	})

})
// (13 用户从厂商得到道具或者说厂商发道具)用户购买发行的道具
app.post('/api/getIssueProductByID', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< getIssueProductByID>>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/getIssueProductByID');
	// if (userType[req.orgName]=="1") {
	// 	res.json({
	// 			"success": false,
	// 			"message": "wrong userType:"+userType[req.orgName]
	// 	});
	// 	return;
	// };
	if (req.body.userType=="0") {
		res.json({
				"success": false,
				"message": "userType　should be 1,but got:"+req.body.userType
		});
		return;
	};
	var oldItem = {"_id":ObjectId(req.body.itemID),"itemStatus":"5"};
	await db.findOne('gameAsset',oldItem, async function (err, result) {
			if (err) {
				return res.json({
					"success": false,
					"message": "内部服务器错误"
				})
			}
			if (!result || result.length === 0) {
				return res.json({
					"success": false,
					"message": "找不到该道具"
				})
			}
			var owner = result.itemCompany
			var buyer = req.body.username
			var itemHistory = result.itemHistory
			var createdTime =(new Date()).toLocaleString();
			var transaction = createdTime + " "+owner+" to "+buyer
			itemHistory.push(transaction)
			logger.debug('itemHistory: ' + itemHistory);
			var newItem = {"itemStatus":"1","owner":buyer,"itemHistory":itemHistory};
      //上链代码
			var peers = ["peer0.org2.example.com","peer1.org2.example.com"];
			var chaincodeName = "mycc";
			var channelName = "mychannel";
			var fcn = "changeGameAssetOwner";
			var args = [req.body.itemID,buyer,transaction]
			await db.updateMany('gameAsset',oldItem,newItem,async function (err, result) {
				if (err) {
					logger.debug('发道具给用户失败: ' + err);
					return res.json({
						"success": false,
						"message": "发道具给用户失败"
					})
				}
				logger.debug(result)
				if(result.n==0){
					logger.debug('发道具给用户失败: ' + result);
					return res.json({
						"success": false,
						"message": "不存在符合条件的道具"
					})
				}
				else{
					let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, req.username, req.orgName);
					return res.json({
						"success": true,
						"message": "发道具给用户成功",
						"blockMessage":message
					})
				}
			})
		})
})
// (7提交出售申请)用户A将自己的道具出售，
app.post('/api/startSellProductByID', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< startSellProductByID>>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/startSellProductByID');
	if (userType[req.orgName]=="0") {
		res.json({
				"success": false,
				"message": "wrong userType,should be 1,got"+userType[req.orgName]
		});
		return;
	};
	var oldItem = {"_id":ObjectId(req.body.itemID),"itemStatus":"1","owner":req.body.username};
	var newItem = {"itemStatus":"2","itemPrice":req.body.itemPrice};
	await db.updateMany('gameAsset',oldItem,newItem, function (err, result) {
		if (err) {
			logger.debug('提交出售请求失败: ' + err);
			return res.json({
				"success": false,
				"message": "提交出售请求失败"
			})
		}
		logger.debug(result)
		if(result.n==0){
			logger.debug('提交出售请求失败: ' + result);
			return res.json({
				"success": false,
				"message": "不存在符合条件的道具"
			})
		}
		else{
			return res.json({
				"success": true,
				"message": "提交出售请求成功"
			})
		}
	})

})
// (8停止出售请求)当道具未被其他用户购买时，用户A可取消出售申请
app.post('/api/stopSellProductByID', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< stopSellProductByID>>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/stopSellProductByID');
	if (userType[req.orgName]=="0") {
		res.json({
				"success": false,
				"message": "wrong userType,should be 1,got"+userType[req.orgName]
		});
		return;
	};
	var oldItem = {"_id":ObjectId(req.body.itemID),"itemStatus":"2","owner":req.body.username};
	var newItem = {"itemStatus":"1"};
	await db.updateMany('gameAsset',oldItem,newItem, function (err, result) {
		if (err) {
			logger.debug('停止出售请求失败: ' + err);
			return res.json({
				"success": false,
				"message": "停止出售请求失败"
			})
		}
		logger.debug(result)
		if(result.n==0){
			logger.debug('停止出售请求失败: ' + result);
			return res.json({
				"success": false,
				"message": "不存在符合条件的道具"
			})
		}
		else{
			return res.json({
				"success": true,
				"message": "停止出售请求成功"
			})
		}
	})

})
// (5 提交购买请求)用户B在平台上看到道具出售信息，提交购买申请
app.post('/api/buyProductByID', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< buyProductByID>>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/buyProductByID');
	if (userType[req.orgName]=="0") {
		res.json({
				"success": false,
				"message": "wrong userType,should be 1,got"+userType[req.orgName]
		});
		return;
	};
	var UserID = req.UserID
	var oldItem = {"_id":ObjectId(req.body.itemID),"itemStatus":"2"};
	var newItem = {"itemStatus":"3","buyer":req.username};
	await db.findOne('gameAsset',oldItem, async function (err, result) {
		if (err) {
			return res.json({
				"success": false,
				"message": "内部服务器错误"
			})
		}
		if (!result || result.length === 0) {
			return res.json({
				"success": false,
				"message": "找不到该道具"
			})
		}
		var itemPrice =parseInt(result.itemPrice)
		await db.findOne('myuser', {"_id":ObjectId(req.UserID) }, async function (err, result) {
			if (err) {
				return res.json({
					"success": false,
					"message": "内部服务器错误"
				})
			}
			if (!result || result.length === 0) {
				return res.json({
					"success": false,
					"message": "找不到用户名"
				})
			}
			var Balance = result.Balance
			var newBalance = Balance-itemPrice
			await db.updateMany('myuser',{"_id":ObjectId(req.UserID) },{"Balance":newBalance},async function (err, result) {
				if (err) {
					logger.debug('内部服务器错误: ' + err);
					return res.json({
						"success": false,
						"message": "内部服务器错误"
					})
				}
				await db.updateMany('gameAsset',oldItem,newItem, function (err, result) {
					if (err) {
						logger.debug('内部服务器错误: ' + err);
						return res.json({
							"success": false,
							"message": "内部服务器错误"
						})
					}

					logger.debug(result)
						return res.json({
							"success": true,
							"message": "提交购买请求成功"
						})
				})
			})
		})

	})
});
// (9确认他人购买请求)用户A同意B的购买申请
app.post('/api/confirmSellProductByID', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< confirmSellProductByID>>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/confirmSellProductByID');
	if (userType[req.orgName]=="0") {
		res.json({
				"success": false,
				"message": "wrong userType,should be 1,got"+userType[req.orgName]
		});
		return;
	};
	if(req.body.confirm){
		var oldItem = {"_id":ObjectId(req.body.itemID),"itemStatus":"3","owner":req.username};
		var newItem = {"itemStatus":"4"};
		await db.updateMany('gameAsset',oldItem,newItem, function (err, result) {
			if (err) {
				return res.json({
					"success": false,
					"message": "内部服务器错误"
				})
			}
			logger.debug(result)
			if(result.n==0){
				logger.debug('确认他人购买请求: ' + result);
				return res.json({
					"success": false,
					"message": "不存在符合条件的道具"
				})
			}
			else{
				return res.json({
					"success": true,
					"message": "确认他人购买请求成功"
				})
			}
		})
	}
	else {
		var oldItem = {"_id":ObjectId(req.body.itemID),"itemStatus":"3","owner":req.username};
		var newItem = {"itemStatus":"2","buyer":""};
		await db.findOne('gameAsset',oldItem, async function (err, result) {
			if (err) {
				return res.json({
					"success": false,
					"message": "内部服务器错误"
				})
			}
			if (!result || result.length === 0) {
				return res.json({
					"success": false,
					"message": "找不到该道具"
				})
			}
			var itemPrice =parseInt(result.itemPrice)
			var buyer = result.buyer
			await db.findOne('myuser', {"Name":buyer }, async function (err, result) {
				if (err) {
					return res.json({
						"success": false,
						"message": "内部服务器错误"
					})
				}
				if (!result || result.length === 0) {
					return res.json({
						"success": false,
						"message": "找不到用户名"
					})
				}
				var Balance = result.Balance
				var newBalance = Balance+itemPrice
				await db.updateMany('myuser',{"Name":buyer },{"Balance":newBalance},async function (err, result) {
					if (err) {
						logger.debug('内部服务器错误: ' + err);
						return res.json({
							"success": false,
							"message": "内部服务器错误"
						})
					}
					await db.updateMany('gameAsset',oldItem,newItem, function (err, result) {
						if (err) {
							logger.debug('内部服务器错误: ' + err);
							return res.json({
								"success": false,
								"message": "内部服务器错误"
							})
						}

						logger.debug(result)
							return res.json({
								"success": true,
								"message": "不同意购买请求成功"
							})
					})
				})
			})

		})

	}
})
// (11批准玩家购买请求)A和B的交易请求提交到游戏公司，游戏公司批准玩家的购买请求，交易完成。
app.post('/api/approveSellProductByID', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< approveSellProductByID>>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/approveSellProductByID');
	if (userType[req.orgName]=="1") {
		res.json({
				"success": false,
				"message": "wrong userType,should be 1,got"+userType[req.orgName]
		});
		return;
	};
	var oldItem = {"_id":ObjectId(req.body.itemID),"itemStatus":"4","itemCompany":req.body.username};
	if(req.body.approve){
		await db.findOne('gameAsset',oldItem, async function (err, result) {
			if (err) {
				return res.json({
					"success": false,
					"message": "内部服务器错误"
				})
			}
			if (!result || result.length === 0) {
				return res.json({
					"success": false,
					"message": "找不到该道具"
				})
			}
			var itemPrice =parseInt(result.itemPrice)
			var owner = result.owner
			var buyer = result.buyer
			var itemHistory = result.itemHistory
			var createdTime = (new Date()).toLocaleString();
			var transaction = createdTime + " "+owner+" to "+buyer
			itemHistory.push(transaction)
			logger.debug('itemHistory: ' + itemHistory);
			var newItem = {"itemStatus":"1","owner":buyer,"buyer":"","itemPrice":"","itemHistory":itemHistory}
			//上链代码
			var peers = ["peer0.org1.example.com","peer1.org1.example.com"];
			var chaincodeName = "mycc";
			var channelName = "mychannel";
			var fcn = "changeGameAssetOwner";
			var args = [req.body.itemID,buyer,transaction]

			await db.findOne('myuser', {"Name":owner }, async function (err, result) {
				if (err) {
					return res.json({
						"success": false,
						"message": "内部服务器错误"
					})
				}
				if (!result || result.length === 0) {
					return res.json({
						"success": false,
						"message": "找不到用户名"
					})
				}
				var Balance = result.Balance
				var newBalance = Balance+itemPrice
				await db.updateMany('myuser',{"Name":owner },{"Balance":newBalance},async function (err, result) {
					if (err) {
						logger.debug('内部服务器错误: ' + err);
						return res.json({
							"success": false,
							"message": "内部服务器错误"
						})
					}

					await db.updateMany('gameAsset',oldItem,newItem,async function (err, result) {
						if (err) {
							logger.debug('内部服务器错误: ' + err);
							return res.json({
								"success": false,
								"message": "内部服务器错误"
							})
						}
						let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, req.username, req.orgName);
						logger.debug(result)
							return res.json({
								"success": true,
								"message": "批准玩家购买请求成功",
								"blockMessage":message
							})
					})
				})
			})

		})
	}else{
		var newItem = {"itemStatus":"2","buyer":""};
		await db.findOne('gameAsset',oldItem, async function (err, result) {
			if (err) {
				return res.json({
					"success": false,
					"message": "内部服务器错误"
				})
			}
			if (!result || result.length === 0) {
				return res.json({
					"success": false,
					"message": "找不到该道具"
				})
			}
			var itemPrice =parseInt(result.itemPrice)
			var buyer = result.buyer
			await db.findOne('myuser', {"Name":buyer }, async function (err, result) {
				if (err) {
					return res.json({
						"success": false,
						"message": "内部服务器错误"
					})
				}
				if (!result || result.length === 0) {
					return res.json({
						"success": false,
						"message": "找不到用户名"
					})
				}
				var Balance = result.Balance
				var newBalance = Balance+itemPrice
				await db.updateMany('myuser',{"Name":buyer },{"Balance":newBalance},async function (err, result) {
					if (err) {
						logger.debug('内部服务器错误: ' + err);
						return res.json({
							"success": false,
							"message": "内部服务器错误"
						})
					}
					await db.updateMany('gameAsset',oldItem,newItem, function (err, result) {
						if (err) {
							logger.debug('内部服务器错误: ' + err);
							return res.json({
								"success": false,
								"message": "内部服务器错误"
							})
						}

						logger.debug(result)
							return res.json({
								"success": true,
								"message": "不批准玩家购买请求成功"
							})
					})
				})
			})

		})

	}
})
// Create Channel
app.post('/api/channels', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< C R E A T E  C H A N N E L >>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/channels');
	var channelName = req.body.channelName;
	var channelConfigPath = req.body.channelConfigPath;
	logger.debug('Channel name : ' + channelName);
	logger.debug('channelConfigPath : ' + channelConfigPath); //../artifacts/channel/mychannel.tx
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!channelConfigPath) {
		res.json(getErrorMessage('\'channelConfigPath\''));
		return;
	}

	let message = await createChannel.createChannel(channelName, channelConfigPath, req.username, req.orgName);
	res.send(message);
});
// Join Channel
app.post('/api/channels/:channelName/peers', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< J O I N  C H A N N E L >>>>>>>>>>>>>>>>>');
	var channelName = req.params.channelName;
	var peers = req.body.peers;
	logger.debug('channelName : ' + channelName);
	logger.debug('peers : ' + peers);
	logger.debug('username :' + req.username);
	logger.debug('orgName:' + req.orgName);

	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!peers || peers.length == 0) {
		res.json(getErrorMessage('\'peers\''));
		return;
	}

	let message =  await join.joinChannel(channelName, peers, req.username, req.orgName);
	res.send(message);
});
// Install chaincode on target peers
app.post('/api/chaincodes', async function(req, res) {
	logger.debug('==================== INSTALL CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.body.chaincodeName;
	var chaincodePath = req.body.chaincodePath;
	var chaincodeVersion = req.body.chaincodeVersion;
	var chaincodeType = req.body.chaincodeType;
	logger.debug('peers : ' + peers); // target peers list
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('chaincodePath  : ' + chaincodePath);
	logger.debug('chaincodeVersion  : ' + chaincodeVersion);
	logger.debug('chaincodeType  : ' + chaincodeType);
	if (!peers || peers.length == 0) {
		res.json(getErrorMessage('\'peers\''));
		return;
	}
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!chaincodePath) {
		res.json(getErrorMessage('\'chaincodePath\''));
		return;
	}
	if (!chaincodeVersion) {
		res.json(getErrorMessage('\'chaincodeVersion\''));
		return;
	}
	if (!chaincodeType) {
		res.json(getErrorMessage('\'chaincodeType\''));
		return;
	}
	let message = await install.installChaincode(peers, chaincodeName, chaincodePath, chaincodeVersion, chaincodeType, req.username, req.orgName)
	res.send(message);});
// Instantiate chaincode on target peers
app.post('/api/channels/:channelName/chaincodes', async function(req, res) {
	logger.debug('==================== INSTANTIATE CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.body.chaincodeName;
	var chaincodeVersion = req.body.chaincodeVersion;
	var channelName = req.params.channelName;
	var chaincodeType = req.body.chaincodeType;
	var fcn = req.body.fcn;
	var args = req.body.args;
	logger.debug('peers  : ' + peers);
	logger.debug('channelName  : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('chaincodeVersion  : ' + chaincodeVersion);
	logger.debug('chaincodeType  : ' + chaincodeType);
	logger.debug('fcn  : ' + fcn);
	logger.debug('args  : ' + args);
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!chaincodeVersion) {
		res.json(getErrorMessage('\'chaincodeVersion\''));
		return;
	}
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!chaincodeType) {
		res.json(getErrorMessage('\'chaincodeType\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}

	let message = await instantiate.instantiateChaincode(peers, channelName, chaincodeName, chaincodeVersion, chaincodeType, fcn, args, req.username, req.orgName);
	res.send(message);
});
// Invoke transaction on chaincode on target peers
app.post('/api/channels/:channelName/chaincodes/:chaincodeName', async function(req, res) {
	logger.debug('==================== INVOKE ON CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.params.chaincodeName;
	var channelName = req.params.channelName;
	var fcn = req.body.fcn;
	var args = req.body.args;
	logger.debug('channelName  : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('fcn  : ' + fcn);
	logger.debug('args  : ' + args);
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!fcn) {
		res.json(getErrorMessage('\'fcn\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}

	let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, req.username, req.orgName);
	res.send(message);
});
// Query on chaincode on target peers
app.get('/api/channels/:channelName/chaincodes/:chaincodeName', async function(req, res) {
	logger.debug('==================== QUERY BY CHAINCODE ==================');
	var channelName = req.params.channelName;
	var chaincodeName = req.params.chaincodeName;
	let args = req.query.args;
	let fcn = req.query.fcn;
	let peer = req.query.peer;

	logger.debug('channelName : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('fcn : ' + fcn);
	logger.debug('args : ' + args);

	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!fcn) {
		res.json(getErrorMessage('\'fcn\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}
	args = args.replace(/'/g, '"');
	args = JSON.parse(args);
	logger.debug(args);

	let message = await query.queryChaincode(peer, channelName, chaincodeName, args, fcn, req.username, req.orgName);
	res.send(message);
});
//  Query Get Block by BlockNumber
app.get('/api/channels/:channelName/blocks/:blockId', async function(req, res) {
	logger.debug('==================== GET BLOCK BY NUMBER ==================');
	let blockId = req.params.blockId;
	let peer = req.query.peer;
	logger.debug('channelName : ' + req.params.channelName);
	logger.debug('BlockID : ' + blockId);
	logger.debug('Peer : ' + peer);
	if (!blockId) {
		res.json(getErrorMessage('\'blockId\''));
		return;
	}

	let message = await query.getBlockByNumber(peer, req.params.channelName, blockId, req.username, req.orgName);
	res.send(message);
});
// Query Get Transaction by Transaction ID
app.get('/api/channels/:channelName/transactions/:trxnId', async function(req, res) {
	logger.debug('================ GET TRANSACTION BY TRANSACTION_ID ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let trxnId = req.params.trxnId;
	let peer = req.query.peer;
	if (!trxnId) {
		res.json(getErrorMessage('\'trxnId\''));
		return;
	}

	let message = await query.getTransactionByID(peer, req.params.channelName, trxnId, req.username, req.orgName);
	res.send(message);
});
// Query Get Block by Hash
app.get('/api/channels/:channelName/blocks', async function(req, res) {
	logger.debug('================ GET BLOCK BY HASH ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let hash = req.query.hash;
	let peer = req.query.peer;
	if (!hash) {
		res.json(getErrorMessage('\'hash\''));
		return;
	}

	let message = await query.getBlockByHash(peer, req.params.channelName, hash, req.username, req.orgName);
	res.send(message);
});
//Query for Channel Information
app.get('/api/channels/:channelName', async function(req, res) {
	logger.debug('================ GET CHANNEL INFORMATION ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let peer = req.query.peer;

	let message = await query.getChainInfo(peer, req.params.channelName, req.username, req.orgName);
	res.send(message);
});
//Query for Channel instantiated chaincodes
app.get('/api/channels/:channelName/chaincodes', async function(req, res) {
	logger.debug('================ GET INSTANTIATED CHAINCODES ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let peer = req.query.peer;

	let message = await query.getInstalledChaincodes(peer, req.params.channelName, 'instantiated', req.username, req.orgName);
	res.send(message);
});
// Query to fetch all Installed/instantiated chaincodes
app.get('/api/chaincodes', async function(req, res) {
	var peer = req.query.peer;
	var installType = req.query.type;
	logger.debug('================ GET INSTALLED CHAINCODES ======================');

	let message = await query.getInstalledChaincodes(peer, null, 'installed', req.username, req.orgName)
	res.send(message);
});
// Query to fetch channels
app.get('/api/channels', async function(req, res) {
	logger.debug('================ GET CHANNELS ======================');
	logger.debug('peer: ' + req.query.peer);
	var peer = req.query.peer;
	if (!peer) {
		res.json(getErrorMessage('\'peer\''));
		return;
	}

	let message = await query.getChannels(peer, req.username, req.orgName);
	res.send(message);
});
