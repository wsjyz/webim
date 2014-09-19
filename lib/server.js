/**
 * Created by dam on 2014/9/5.
 */
var connectionList = {};//保存连接，暂时保存在内存中，将来要放到合适的缓存
var userList = [];//保存socketId和username

function tbcimServer(io){

    io.sockets.on('connection', function (socket) {
        //客户端连接时，保存socketId和用户名
        var socketId = socket.id;
        connectionList[socketId] = {
            socket: socket
        };
        //TODO 临时先用一个数组来存储名字
        socket.broadcast.emit('broadcast_connected', {socketId:socketId});
        //用户进入聊天室事件，向其他在线用户广播其用户名
        socket.on('join', function (data) {
            if(data){
                var user = {};
                user.socketId = socketId;
                user.userName = data.username;
                userList.push(user);
                connectionList[socketId].username = data.username;
                io.sockets.emit('broadcast_join',userList);//向所有连接上来的广播
                //socket.broadcast.emit('broadcast_join', 'sss');
            }

        });

        //用户离开聊天室事件，向其他在线用户广播其离开
        socket.on('disconnect', function () {
            var name = connectionList[socketId].username;
            if (connectionList[socketId].username) {
                socket.broadcast.emit('broadcast_quit', {
                    username: connectionList[socketId].username,
                    userId:socketId
                });
            }
            delete connectionList[socketId];
            for(var i=0;i < userList.length;i++){
                if(userList[i].userName == name){
                    userList.splice(i,1);
                }
            }
        });

        //用户发言事件，向其他在线用户广播其发言内容
        socket.on('say', function (data) {
            socket.broadcast.emit('broadcast_say',{
                username: connectionList[socketId].username,
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
        socket.on('video_invite', function (data) {
            var client_socket = connectionList[data.toSocketId].socket;
            client_socket.emit('video_invite',data);
        });
        socket.on('video_invite_agree', function (data) {
            var client_socket = connectionList[data.needAgreeSocketId].socket;
            client_socket.emit('video_invite_agree',connectionList[data.whoAgreeSocketId].username);
        });
    });

}

module.exports = tbcimServer;