var storage = window.localStorage;
// 获取localStorage数据

var d_username = storage['d-username'];
var d_userType = storage['d-userType'];
var d_balance = storage['d-balance'];
var d_token = storage['d-token'];

document.writeln('	<div class="header">');
document.writeln('		<div class="container">');
document.writeln('			<div class="header-grid">');
document.writeln('				<div class="header-grid-left">');
document.writeln('					<ul>');
if(d_token){ // 已登录
	document.writeln('						<li id="loginInfo">欢迎您 '+d_username+' !</li>');
	document.writeln('						<li id="center"><i class="glyphicon glyphicon-user" aria-hidden="true"></i><a href="center.html">信息中心</a></li>');
	document.writeln('						<li id="loginOut"><i class="glyphicon glyphicon-log-out" aria-hidden="true"></i><a href="#">注销登录</a></li>');
}else{ // 未登录
	document.writeln('						<li id="loginInfo">请您登录系统 ！</li>');
	document.writeln('						<li id="login"><i class="glyphicon glyphicon-log-in" aria-hidden="true"></i><a href="login.html">登录</a></li>');
}
document.writeln('					</ul>');
document.writeln('				</div>');
document.writeln('				<div class="clearfix"> </div>');
document.writeln('			</div>');
document.writeln('			<div class="logo-nav">');
document.writeln('				<div class="logo-nav-left">');
document.writeln('					<h1><a href="index.html" id="DemoTitle" ></a></h1>');
document.writeln('				</div>');
document.writeln('				<div class="logo-nav-left1">');
document.writeln('					<nav class="navbar navbar-default">');
document.writeln('					<div class="navbar-header nav_2">');
document.writeln('						<button type="button" class="navbar-toggle collapsed navbar-toggle1" data-toggle="collapse" data-target="#bs-megadropdown-tabs">');
document.writeln('							<span class="sr-only">Toggle navigation</span>');
document.writeln('							<span class="icon-bar"></span>');
document.writeln('							<span class="icon-bar"></span>');
document.writeln('							<span class="icon-bar"></span>');
document.writeln('						</button>');
document.writeln('					</div>');
document.writeln('					<div class="collapse navbar-collapse" id="bs-megadropdown-tabs">');
document.writeln('						<ul class="nav navbar-nav">');
document.writeln('							<li class="dropdown" id="youxi">');
document.writeln('								<a href="#" class="dropdown-toggle" data-toggle="dropdown">王者荣耀<b class="caret"></b></a>');
document.writeln('								<ul class="dropdown-menu multi-column columns-3">');
document.writeln('									<div class="row">');
document.writeln('										<div class="col-sm-12">');
document.writeln('											<ul class="multi-column-dropdown">');
document.writeln('												<h6><a href="productsSpec.html?company=ccc">打怪得装备</a></h6>');
document.writeln('												<h6><a href="giveSpec.html?company=ccc">游戏内赠与</a></h6>');
document.writeln('											</ul>');
document.writeln('										</div>');
document.writeln('										<div class="clearfix"></div>');
document.writeln('										<div class="clearfix"></div>');
document.writeln('								</ul>');
document.writeln('							</li>');
document.writeln('							<li><a href="">&nbsp;</a></li>');
document.writeln('							<li id="shichang"><a href="productsAll.html">区块链游戏交易平台</a></li>');
document.writeln('							<li><a href="">&nbsp;</a></li>');
document.writeln('							<li id="chaxun"><a href="query.html">查询道具</a></li>');
document.writeln('						</ul>');
document.writeln('					</div>');
document.writeln('					</nav>');
document.writeln('				</div>');
document.writeln('				<div class="clearfix"> </div>');
document.writeln('			</div>');
document.writeln('		</div>');
document.writeln('	</div>');

// 取消登录
$('#loginOut').on('click', function () {
	localStorage.removeItem('d-username');
	localStorage.removeItem('d-userType');
	localStorage.removeItem('d-balance');
	localStorage.removeItem('d-token');
	self.location='index.html';
	console.log('localStorage删除完毕');
});
