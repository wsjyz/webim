/**
 * Created by dam on 2014/9/5.
 */
var roomUsers={};
var roomMedias={};

function tbcimServer(io){

    io.sockets.on('connection', function (socket) {
        //客户端连接时，保存socketId和用户名
        var socketId = socket.id;
        //用户进入聊天室事件，向其他在线用户广播其用户名
        socket.on('join_room', function (data) {
            if(data){
                var room = data.roomId || "default";
                var userId = data.userId;
                var curRoomUsers =roomUsers[room] =  roomUsers[room]||[];
                var medias = roomMedias[room] = roomMedias[room] || [];
                var panelMessage;
                var mediaType;
                if(medias.length == 1){
                    var mediaUser = medias[0];
                    mediaType = mediaUser.mediaType;
                    if(mediaUser.mediaType == "video"){
                        panelMessage = mediaUser.userName+"正在等待大家加入视频聊天";
                    }else{
                        panelMessage = mediaUser.userName + "正在等待大家加入音频聊天";
                    }
                }else if(medias.length > 1){
                    var mediaUser = medias[0]
                    mediaType = mediaUser.mediaType;
                    if(mediaUser.mediaType == "video"){
                        panelMessage = mediaUser.userName+"等"+medias.length+"人正在视频聊天";
                    }else{
                        panelMessage = mediaUser.userName+"等"+medias.length+"人正在音频聊天";
                    }
                }
                var user = {};
                user.socketId = socketId;
                user.userName = data.userName;
                curRoomUsers.push(user);
                socket.join(room);
                this.userId = userId;
                this.userName = data.userName;
                this.room = room;
                console.log(curRoomUsers);
                console.log(roomMedias[room]);
                io.to(room).emit('broadcast_join_room',{userList:curRoomUsers,mediaType:mediaType,panelMessage:panelMessage});
            }

        });

        //用户离开聊天室事件，向其他在线用户广播其离开
        socket.on('disconnect', function () {
            var name = this.userName;
            var room = this.room;
            var userId = this.userId;
            if (name) {
                io.to(room).emit('broadcast_quit_room', {
                    userName: name,
                    userId:socketId
                });
            }
            var curRoomUsers =roomUsers[room] || [];
            for(var i=0;i < curRoomUsers.length;i++){
                if(curRoomUsers[i].socketId == socketId){
                    curRoomUsers.splice(i,1);
                }
            }
            var curMedias = roomMedias[room] || [];
            for(var j = 0; j < curMedias.length; j++){
                if(curMedias[j].userId == userId){
                    curMedias.splice(j, 1);
                }
            }
        });
        //监听用户加入音视频
        socket.on("broadcast_join_rtc_room", function (data) {
            var mediaType = data.mediaType
            var medias = roomMedias[this.room];
            var user = {};
            user.userId = this.userId;
            user.userName = this.userName;
            user.mediaType = mediaType;
            medias.push(user);
            var panelMessage;
            if(medias.length == 1){
                if(mediaType == "video"){
                    panelMessage = this.userName+"正在等待大家加入视频聊天";
                }else{
                    panelMessage = this.userName + "正在等待大家加入音频聊天";
                }
            }else{
                if(mediaType == "video"){
                    panelMessage = medias[0].userName+"等"+medias.length+"人正在视频聊天";
                }else{
                    panelMessage = medias[0].userName+"等"+medias.length+"人正在音频聊天";
                }
            }
            io.to(this.room).emit("broadcast_join_rtc_room",{user:user,mediaType:mediaType,panelMessage:panelMessage});
        });

        //用户发言事件，向其他在线用户广播其发言内容
        socket.on('broadcast_send_text_msg', function (data) {
            io.to(this.room).emit('broadcast_send_text_msg',{
                userName:socket.userName,
                content: data.content
            });
        });
        //发送图片等二进制数据
        socket.on('broadcast_send_blob_msg', function (data) {
            io.to(this.room).emit('broadcast_send_blob_msg',{
                userName: this.userName,
                blob_message: data
            });
        });
    });

}

module.exports = tbcimServer;