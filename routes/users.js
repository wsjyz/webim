var express = require('express');
var router = express.Router();
var http = require("http");
var qs = require("querystring");
/* GET users listing. */
router.get('/', function(req, res) {
  res.send('respond with a resource');
});


router.get('/video', function(req, res) {
    res.render('video');
});

router.get('/simplewebrtctest', function(req, res) {
    res.render('simplewebrtctest');
});

router.get('/chat', function(req, res) {
    var elnSessionId = req.cookies.eln_session_id;
    var query = req.query;
    var toUserId = query.toUserId;
    var toUserName = query.toUserName;
    var chatType = query.chatType;
    var room = query.room;
    if(!(toUserId && toUserName && chatType && room)){
        res.render("tip", {login: "arg"});
        return;
    }
    if(!elnSessionId) {
        res.render("tip", {login: "login"});
        return ;
    }
    var arg = {
        appKey_:"2688CDD8C0634A1A88C15D64C47C1330",
        sign_:"3C1C35AFD67EB8A45DB565FAB70DDE6C",
        timestamp_:new Date().getTime()
    };
    arg.elnSessionId = elnSessionId;
    var options = {
        hostname: "eln.test2.net",
        path: "/open/v1/uc/user/isLoginAndReturnOpenUser.html?" + qs.stringify(arg),
        method:'GET'
    }
    var req = http.request(options, function (resp) {
        resp.setEncoding("utf-8");
        resp.on('data', function (chunk) {
            var data = JSON.parse(chunk);
            console.log(chunk)
            if (!!data && data.userId) {
                res.render('chat', {
                    userId: data.userId,
                    userName: data.userName,
                    userPic: data.faceUrl,
                    chatType: "user",
                    toUserId: toUserId,
                    toUserName: toUserName,
                    room: room
                });
            }else{
                res.render("tip", {login: "login"});
                return ;
            }
        })
    });
    req.end();
});

router.get('/stunclient', function(req, res) {
    res.render('modal');
});

router.get("/test",function(req, res){
    res.render("test")
})
router.post("/record", function (req, res) {
    var arg = req.body;
    res.send({TotalPages:98,rows:[{fromUserName:"张三",createTime:"2014-09-08 03:04:05",msgContent:'dsadsakdhsakdjh'+JSON.stringify(req.body)},{fromUserName:"李四", createTime:"2014-10-01 09:08:03",msgContent:"fsdjflafjldas"}]});
});
module.exports = router;
