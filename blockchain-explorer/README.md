首先需要下载数据库，

sudo apt-get install postgresql

然后进入数据库，

sudo -u postgres psql

运行数据库创建脚本：

\i app/db/explorerpg.sql
\i app/db/updatepg.sql

查看数据库和表的创建情况：

\l view created fabricexplorer database
\d view created tables

为了方便编译和后台运行，采用cnpm和forever
npm install -g cnpm
npm install -g forever


然后就是编译，执行。

编译 可用 脚本 build.sh
执行 可用 脚本 start.sh
