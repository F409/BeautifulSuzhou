首先需要下载数据库， 

sudo apt-get install postgresql

然后进入数据库，

sudo -u postgres psql

接着创建表，

	在进入数据库之后，复制app/db/explorerpg.sql内容后执行

	接着复制app/db/updatepg.sql内容后执行

然后就是编译，执行。

编译 可用 脚本 build.sh
执行 可用 脚本 start.sh