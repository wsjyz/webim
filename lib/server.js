/**
 * Created by dam on 2014/9/5.
 */
var roomUsers={};

function tbcimServer(io){

    io.sockets.on('connection', function (socket) {
        //客户端连接时，保存socketId和用户名
        var socketId = socket.id;
        //用户进入聊天室事件，向其他在线用户广播其用户名
        socket.on('join', function (data) {
            if(data){
                var room = data.room || "default";
                var curRoomUsers =roomUsers[room] =  roomUsers[room]||[];
                var user = {};
                user.socketId = socketId;
                user.userName = data.username;
                curRoomUsers.push(user);
                socket.join(room);
                this.username = data.username;
                this.room = room;
                io.to(room).emit('broadcast_join',{userList:curRoomUsers, joinName:this.username});
            }

        });

        //用户离开聊天室事件，向其他在线用户广播其离开
        socket.on('disconnect', function () {
            var name = this.username;
            var room = this.room;
            if (name) {
                io.to(room).emit('broadcast_quit', {
                    username: name,
                    userId:socketId
                });
            }
            var curRoomUsers =roomUsers[room] || [];
            for(var i=0;i < curRoomUsers.length;i++){
                if(curRoomUsers[i].userName == name){
                    curRoomUsers.splice(i,1);
                }
            }
        });

        //用户发言事件，向其他在线用户广播其发言内容
        socket.on('say', function (data) {
            io.to(this.room).emit('broadcast_say',{
                username:socket.username,
                text: data.text
            });
        });
        //发送图片等二进制数据
        socket.on('send_blob', function (data) {
            socket.broadcast.emit('broadcast_blob',{
                username: connectionList[socketId].username,
                blob_message: data
            });
        });
    });

}

module.exports = tbcimServer;