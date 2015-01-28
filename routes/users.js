var express = require('express');
var router = express.Router();
var http = require("http");
var qs = require("querystring");
var settings = require("../lib/settings")
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
        appKey_:settings.appKey,
        sign_:settings.chat_sign,
        timestamp_:new Date().getTime()
    };
    arg.elnSessionId = elnSessionId;
    var options = {
        hostname: settings.open_hostName,
        path: "/open/v1/uc/user/isLoginAndReturnOpenUser.html?" + qs.stringify(arg),
        method:'GET'
    }
    var req = http.request(options, function (resp) {
        resp.setEncoding("utf-8");
        if(resp.statusCode != 200){
            res.render("tip", {login: "error"});
            return ;
        }
        resp.on('data', function (chunk) {
            var data = JSON.parse(chunk);
            if (!!data && data.userId) {
                res.render('chat', {
                    userId: data.userId,
                    userName: data.userName,
                    userPic: data.faceUrl?data.faceUrl:"/static/img/1.png",
                    chatType: "user",
                    toUserId: toUserId,
                    toUserName: toUserName,
                    room: room,
                    corpCode:data.corpCode
                });
            }else{
                res.render("tip", {login: "login"});
                return ;
            }
        })
    });
    req.on("error", function (error) {
        console.log(error);
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
    var options = {
        hostname:settings.open_hostName,
        path:'/open/v1/im/message/listPrivateMsgs.html',
        method:'POST'
    };
    arg.appKey_ =settings.appKey;
    arg.sign_ = settings.record_sign;
    arg.timestamp_ = new Date().getTime();
    arg.corpCode = req.cookies.corp_code;
    var postReq = http.request(options);
    postReq.setHeader("Content-Type", "text/html");
    postReq.on("response", function(postRes){
        var str = "";
        postRes.on("data",function(chunk){
            str += chunk.toString();
        })
        postRes.on("end",function(){
            if(postRes.statusCode == 200){
                 res.send(JSON.parse(str));
            }else{
                res.statusCode(postRes.statusCode);
                res.end();
            }
        });
    });
    postReq.on("error", function(error){
        console.log(error);
    })
    postReq.write(qs.stringify(arg));
    postReq.end();

});
module.exports = router;
