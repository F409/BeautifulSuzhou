var assert = require('assert');
var dbhandler = require('./dbhandler.js');
// s = [{"sname":"iris","age":20},{"sname":"wangwu","age":20},{"sname":"chengliu","age":20}]
// dbhandler.operate("add","res","student",s,function(result){
//   console.log(res);
// })

var res={}

// dbhandler.operate("delete",res,"student",s,function(result){
//   res.response = result
//   console.log(res)
// })
// s=[{"sname":"iris"},{$set:{"age":18}}]
// dbhandler.operate("update",res,"student",s,function(result){
//   res.response = result
//   console.log(res)
// })

// s={"sname":"iris"}
// s={}
var ObjectId = require('mongodb').ObjectId
s = {"_id":ObjectId("5ae716e3138ecf35fcd1fd0a")}
dbhandler.operate("find",res,"student",s,function(result){
  res.response = result
  console.log(res)
})
