/**
 * Created by dam on 2014/9/5.
 */

function tbcimServer(io) {
    var roomUsers = {};
    var roomMedias = {};
    var roomSockets = {};

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

    function getTimeStr(){
        var time = new Date();
        var hours = time.getHours();
        var minutes = time.getMinutes();
        var seconds = time.getSeconds();
        if(hours < 10) hours = '0' + hours;
        if(minutes < 10) minutes = '0' + minutes;
        if(seconds<10)seconds = "0" + seconds;
        return hours+":"+minutes+":"+seconds;
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