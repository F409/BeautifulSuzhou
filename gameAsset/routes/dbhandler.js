var mongo=require("mongodb");//@2.2.11
var MongoClient = mongo.MongoClient;
var assert = require('assert');
var host="localhost";
var port="27017";
var Urls = 'mongodb://localhost:27017/school';


//add一条数据
var add = function(db,collections,selector,fn){
  var collection = db.collection(collections);
  collection.insertMany(selector,function(err,result){
    assert.equal(err,null);
    fn(result);
    db.close();
  });
}
//delete
var deletes = function(db,collections,selector,fn){
  var collection = db.collection(collections);
  collection.remove(selector,function(err,result){
    try{assert.equal(err,null)}catch(e){
      console.log(e);
    }
    fn(result);
    db.close();
  });

};
//find
var find = function(db,collections,selector,fn){
  var collection = db.collection(collections);

    collection.find(selector).toArray(function(err,docs){

      try{
        assert.equal(err,null);
      }catch(e){
        console.log(e);
        docs = [];
      }

      fn(docs);
      db.close();
    });

}
//（权限控制） -- 暂时没有用
MongoClient.connect(Urls, function(err, db) {
  find(db,"powers",null,function(d){
    console.log("123s");
    console.log(d.length);
  });
});

//update
var updates = function(db,collections,selector,fn){
  var collection = db.collection(collections);
  console.log(selector);
  collection.update(selector[0],selector[1],function(err,result){
    assert.equal(err,null);
    assert.equal(1,result.result.n);
    fn(result);
    db.close();
  });

}

//方法都赋值到操作对象上，便于调用
var methodType = {
  login:find,
  show:find,
  add:add,
  getpower:find,
  update:updates,
  delete:deletes,
  updatepass:updates,
  adduser:add,
  usershow:find,
  getcategory:find,
  getcourse:find,
  find:find,
  state:find,
  top:find,
  AddDirectory:find,
  updateDirectory:updates,
  deleteDirectory:deletes,
  showlist:find,
  showdir:find
};
//主逻辑
 var operate = function(req,res,collections,selector,fn){
  MongoClient.connect(Urls, function(err, db) {
    assert.equal(null, err);
    console.log("Connected correctly to server");
    methodType[req](db,collections,selector,fn);
    db.close();
  });

};
exports.operate = operate;
