/**
 * Created by dam on 2014/9/5.
 */
var settings = require("./settings");
var qs = require("querystring");
var http = require("http");
var options = {
    hostname:settings.open_hostName,
    path:'/open/v1/im/message/savePrivateMsgs.html',
    method:'POST'
}
function tbcimServer(io) {
    var roomUsers = {};
    var roomMedias = {};
    var roomSockets = {};
    var roomMsgs = [];
    function sendMessage(sockets, eventName, data, exclude, excludeSocket) {
        if(exclude) {
            for(var i = 0; i < sockets.length; i++) {
                if(sockets[i] == excludeSocket) {
                    continue;
                }else{
                    sockets[i].emit(eventName, data);
                }
            }
        }else{
            for(var i = 0; i < sockets.length; i++) {
                sockets[i].emit(eventName, data);
            }
        }
    }

    function saveMsg(){
        var tRoomMsgs = roomMsgs;
        roomMsgs=[];
        if(tRoomMsgs.length > 0){
            var arg = {
                appKey_:settings.appKey,
                sign_:settings.msg_sign,
                timestamp_:new Date().getTime()
            };
            arg.openPrivateMsgList = JSON.stringify(tRoomMsgs);
            var req = http.request(options);
            req.setHeader("Content-Type", "text/html");
            req.on("response", function(res){
                res.on("data",function(chunk){
                    console.log(chunk.toString())
                })
            });
            req.on("error",function(error){
               console.log(error)
            });
            console.log(qs.stringify(arg));
            req.write(qs.stringify(arg));
            req.end();
        }
    }
    setInterval(saveMsg, 3000);

    function getTimeStr(){
        var time = new Date();
        var year = time.getFullYear();
        var month = time.getMonth()+1;
        var day = time.getDate();
        var hours = time.getHours();
        var minutes = time.getMinutes();
        var seconds = time.getSeconds();
        if(month<10) month = "0" + month;
        if(day<10) day = "0" + day;
        if(hours < 10) hours = '0' + hours;
        if(minutes < 10) minutes = '0' + minutes;
        if(seconds<10)seconds = "0" + seconds;
        return year + "-"+month+"-"+day+" " +hours+":"+minutes+":"+seconds;
    }

    io.on('connection', function (socket) {
        if (false) {
            socket.emit("connection_quit", {quit: true, msg: "人数已满"});
            socket.disconnect();
        } else {
            socket.emit("connection_quit", {quit: false});
            socket.on('join_room', function (data) {
                var inviteMsg;
                var room = data.roomId || "default";
                var curRoomUsers = roomUsers[room] = roomUsers[room] || [];
                var curMedias = roomMedias[room] = roomMedias[room] || [];
                var curSockets = roomSockets[room] = roomSockets[room] || [];
                var user = {};
                user.userId = data.userId;
                user.userName = data.userName;
                user.userPic = data.userPic;
                socket.user = user;
                socket.room = room;
                curSockets.push(socket);
                curRoomUsers.push(user);
                sendMessage(curSockets,"broadcast_join_room", {userList: curRoomUsers}, false);
                sendMessage(curSockets,"broadcast_join_room_user", {user:user}, true,socket);
                if(curMedias.length > 0){
                    if( curMedias.length == 1) {
                        inviteMsg = curMedias[0].userName+"正在等待视频聊天";
                    }else if(curMedias.length > 1){
                        inviteMsg = curMedias[0].userName + "等" + curMedias.length + "人正在视频聊天";
                    }
                    socket.emit("broadcast_invite_rtc_room", {msg:inviteMsg});
                }

            });

            socket.on('broadcast_send_text_msg', function (data) {
                sendMessage(roomSockets[socket.room], 'broadcast_send_text_msg', {
                    user: socket.user,
                    content: data.content,
                    time:getTimeStr()
                },true,socket);
                var msg = {};
                msg.fromUserId = socket.user.userId;
                msg.fromUserName=socket.user.userName;
                msg.toUserId = data.toUserId;
                msg.toUserName = data.toUserName;
                msg.toUserType = data.toUserType;
//                msg.bothUserId=socket.user.userId+"|"+data.toUserId;
                msg.msgContent = data.content;
                msg.createBy = socket.user.userId;
                msg.lastModifyBy = socket.user.userId;
                msg.createTime=getTimeStr();
                msg.corpCode=data.corpCode;
                roomMsgs.push(msg);
            });
            socket.on("broadcast_join_rtc_room", function (data) {
                socket.media = true;
                var msg ;
                var curMedias = roomMedias[socket.room];
                curMedias.push(socket.user);
                if(curMedias.length ==1){
                    msg = curMedias[0].userName+"正在等待视频聊天";
                }else{
                    msg = curMedias[0].userName + "等" + curMedias.length + "人正在视频聊天";
                }
                sendMessage(roomSockets[socket.room], "broadcast_join_rtc_room", {msg: msg, user:socket.user}, true, socket);
            });

            socket.on("broadcast_quit_rtc_room",function(){
                socket.media = false;
                var curMedias = roomMedias[socket.room];
                var curSockets = roomSockets[socket.room];
                for(var i = 0; i < curMedias.length; i++){
                    if(curMedias[i] == socket.user) {
                        curMedias.splice(i, 1);
                        break;
                    }
                }
                sendMessage(curSockets, "broadcast_quit_rtc_room", {user: socket.user}, true, socket);
            });

            socket.on("disconnect", function () {
                if(!socket.room)
                    return;
                var curRoomUsers = roomUsers[socket.room];
                var curSockets = roomSockets[socket.room];
                var curMedias = roomMedias[socket.room];
                sendMessage(curSockets, "broadcast_quit_room", socket.user, true, socket);
                for(var i =0; i < curSockets.length; i++) {
                    if(curSockets[i] == socket){
                        curSockets.splice(i, 1);
                        curRoomUsers.splice(i, 1);
                        break;
                    }
                }
                if (socket.media) {
                    for(var i = 0; i < curMedias.length; i++){
                        if(curMedias[i] == socket.user) {
                            curMedias.splice(i, 1);
                            break;
                        }
                    }
                }
            });

        }
    });
}

module.exports = tbcimServer;