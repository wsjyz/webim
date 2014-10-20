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
            });

            socket.on('broadcast_send_text_msg', function (data) {
                sendMessage(roomSockets[socket.room], 'broadcast_send_text_msg', {
                    user: socket.user,
                    content: data.content,
                    time:getTimeStr()
                },true,socket);
            });


            socket.on("disconnect", function () {
                var curRoomUsers = roomUsers[socket.room];
                var curSockets = roomSockets[socket.room];
                sendMessage(curSockets, "broadcast_quit_room", socket.user, true, socket);
                console.log(curRoomUsers.length);
                console.log(curSockets.length)
                for(var i =0; i < curSockets.length; i++) {
                    if(curSockets[i] == socket){
                        curSockets.splice(i, 1);
                        curRoomUsers.splice(i, 1);
                        break;
                    }
                }
                console.log(curRoomUsers.length);
                console.log(curSockets.length)

            });

        }
    });
}

module.exports = tbcimServer;