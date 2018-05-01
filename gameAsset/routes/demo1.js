var MongoClient = require("mongodb").MongoClient;
var DB_URL = "mongodb://localhost:27017/school";
var assert = require("assert"); //
function insertData(db)
{
    var devices = db.collection('student');
    var data = {"sname":"node","age":22,"addr":"nb","addTime":new Date()};
    devices.insert(data,function(error, result){
        if(error)
        {
            console.log('Error:'+ error);
        }else{

            console.log(result.result.n);
        }
        db.close();
    });
}
var selectData = function(db, callback) {
  //连接到表
  var collection = db.collection('student');
  //查询数据
  var whereStr = {"sname":'node'};
  collection.find(whereStr,function(error, cursor){
    cursor.each(function(error,doc){
        if(doc){
            //console.log(doc);
            // if (doc.addTime) {
            //     console.log("addTime: "+doc.addTime);
            // }
            console.log(doc)
        }
    });

  });

}

MongoClient.connect(DB_URL, function(error, db){
    console.log('连接成功!');
    // insertData(db);
//     selectData(db, function(result) {
//   // console.log(result);
//   // db.close();
// });

//插入数据
// db.collection("student").insert({"sname":"xiaoming"},function(err,result){ //连接到数据库上面，并使用参数传入集合
//     assert.equal(null,err);
//     console.log(result);
//     db.close();
// });

//删除数据
// db.collection("student").deleteOne({"sname":"xiaoming"},function(err,result){ //连接到数据库上面，并使用参数传入集合
//     assert.equal(null,err);
//     console.log(result);
//     db.close();
// });
db.collection("student").update({"sname":"zhangsan"},{$set:{"sname":"xiaoming"}},function(err,result){ //连接到数据库上面，并使用参数传入集合
    assert.equal(null,err);
    console.log(result);
    db.close();
});
db.collection("student").find().toArray(function(err,result){
    assert.equal(null,err);
    console.log(result[0].sname);
    db.close();
})

});
