$(function () {
    var webRTC;
    var messageInner = $(".webim-message-box-innner");
    var onlineUsers = $(".webim-online-users");
    var messageSendDiv = $(".webim-message-send-div");
    var messageBox = $(".webim-message-box");
    var count = 0;
    var socket;
    var userId = new Date().getTime();
    var userPic = "/static/img/av2.jpg";
    var room = window.location.hash.slice(1);
    if (!room) {
        room = "default"
    }
 /*   bootbox.prompt("What is your name?", function (result) {
        if (result === null || $.trim(result) == "") {
            bootbox.alert("用户信息丢失,请重新打开网页!");
        } else {
            joinRoom(userId, result, room,userPic);

        }
    });*/
    joinRoom(userId, new Date().getTime(), room,userPic);

    function joinRoom(userId, userName, room,userPic) {
        socket = io('http://feifei.com:3002/');
        socket.on("connection_quit", function (data) {
            if(data.quit) {
                bootbox.alert(data.msg);
            }else{
                //发送加入事件
                socket.emit('join_room', { userId: userId, userName: userName, roomId: room, userPic:userPic});
                //注册各种事件监听
                socket.on("broadcast_join_room", function(data){
                    var userList = data.userList;
                    var listContent = new StringBuffer();
                    onlineUsers.empty();
                    for(var i = 0; i < userList.length; i++) {
                        var user = userList[i];
                        listContent.append('<li id="'+user.userId+'"><img src="'+user.userPic+'" />'+user.userName+'</li>');
                    }
                    onlineUsers.append(listContent.toString());
                });

                $("#webim_message_send_btn").click(function() {
                    var content = messageSendDiv.html();
                    socket.emit('broadcast_send_text_msg', {content:content});
                    addMessage({user:{userPic:userPic,userName:userName},content:content,time:getTimeStr()},true);
                    messageSendDiv.html("").focus();
                });

                //监听聊天的消息接收
                socket.on('broadcast_send_text_msg', function(data){
                    addMessage(data,false);
                });
                //监听退出
                socket.on("broadcast_quit_room",function(data) {
                    userLeave(data);
                    addTip("用户" + data.userName + "离开了");
                });

                socket.on('broadcast_join_rtc_room', function (data) {
                    if(!webRTC){
                        doInvite(data.msg);
                    }
                    addTip("用户"+data.user.userName+"进入视频聊天");
                });

                socket.on('broadcast_quit_rtc_room', function (data) {
                    addTip("用户"+data.user.userName+"退出了视频聊天");
                });

                socket.on("broadcast_invite_rtc_room", function (data) {
                    doInvite(data.msg);
                });

                $("#webim_message_video_btn").click(function(){
                    $(this).attr("disabled", true);
                    doCloseInvite();
                    if(webRTC){
                        webRTC.joinRoom(room);
                        $("#webim-videos").children().first().show();
                    }else{
                        webRTC = new SimpleWebRTC({
                            localVideoEl: 'webim-videos',
                            remoteVideosEl: 'webim-videos',
                            autoRequestMedia: true
                        });
                        webRTC.on('readyToCall', function () {
                            webRTC.joinRoom(room);
                        });
                        webRTC.on("joinedRoom",function(){
                            socket.emit("broadcast_join_rtc_room")
                        })
                    }
                });


                $("#webim_message_record_btn").click(function(){
                    var pInvite = $(".webim-invite");
                    var pUserBOx = $(".webim-online-users-box");
                    var pRecoreBox = $(".webim-record-box");
                    var pRecordUl = $(".webim-record-ul");
                    var pOnlineUsers = $(".webim-online-users");
                    if($(this).hasClass("active")){
                        $(this).removeClass("active");
                        pRecoreBox.hide();
                        if(pInvite.is(":hidden")){
                            pOnlineUsers.removeClass("webim-invite-users");
                            pRecordUl.removeClass("webim-record-ul-invite");
                            pInvite.removeClass("webim-invite-record");
                            pUserBOx.show();
                        }else{
                            pOnlineUsers.addClass("webim-invite-users");
                            pRecordUl.removeClass("webim-record-ul-invite");
                            pInvite.removeClass("webim-invite-record");
                            pUserBOx.show();
                        }
                    }else{
                        $(this).addClass("active");
                        pUserBOx.hide();
                        if(pInvite.is(":hidden")){
                            pInvite.addClass("webim-invite-record");
                            pOnlineUsers.removeClass("webim-invite-users");
                            pRecordUl.removeClass("webim-record-ul-invite");
                            pRecoreBox.show();
                        }else{
                            pInvite.addClass("webim-invite-record");
                            pRecordUl.addClass("webim-record-ul-invite");
                            pOnlineUsers.addClass("webim-invite-users");
                            pRecoreBox.show();
                        }
                    }
                });

                toggleVideo = function (arg){
                    if($(arg).html() == "关闭视频"){
                        webRTC.pauseVideo();
                        $(arg).html("开启视频");
                    }else{
                        webRTC.resumeVideo();
                        $(arg).html("关闭视频");
                    }

                }
                toggleAudio =  function (arg) {
                    if($(arg).html() == "关闭语音"){
                        webRTC.mute();
                        $(arg).html("开启语音");
                    }else{
                        webRTC.unmute();
                        $(arg).html("关闭语音");
                    }
                }

                holdOffVIdeo = function (arg){
                    webRTC.leaveRoom();
                    $("#webim-videos").children().first().hide();
                    $("#webim_message_video_btn").prop("disabled", false);
                    socket.emit("broadcast_quit_rtc_room");
                }


            }
        });
    }

    function addMessage(data, isSelf){
        count+=1;
        if(isSelf){
            var htmlMessageElement = '<div id="msg-'+count+'" class="webim-message-inner-left"><img class="webim-user-head-pic"  src="' +
                data.user.userPic + '" />' +
                '<span class="webim-triangle-left"></span><div class="webim-message"><h6> ' + '你' +
                ' <span class="time">' +data.time+ '</span></h6>' + data.content + '</div></div>';
            messageInner.append(htmlMessageElement);
            $('#msg-'+count).fadeOut(0).fadeIn(500);
        }else{
            var htmlMessageElement = '<div id="msg-'+count+'" class="webim-message-inner-left"><img class="webim-user-head-pic"  src="' + data.user.userPic + '" />' +
                '<span class="webim-triangle-left"></span><div class="webim-message"><h6> ' + data.user.userName +
                ' <span class="time">' +data.time+ '</span></h6>' + data.content + '</div></div>';
            messageInner.append(htmlMessageElement);
            $('#msg-'+count).fadeOut(0).fadeIn(500);
        }
        messageBox.animate({ scrollTop: messageInner.height() },500);
    }

    function userLeave(data){
        $("#"+data.userId).slideUp(500,function() {
            $(this).remove();
        });

    }

    function addTip(tip){
        count += 1;
        htmlMessageElement = '<div id="msg-'+count+'" class="webim-message-inner-left"><div class="webim-message-tip">'+tip+'</div></div>';
        messageInner.append(htmlMessageElement);
        $('#msg-'+count).fadeOut(0).fadeIn(500);
        messageBox.animate({ scrollTop: messageInner.height() },500);
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

    //视频语音邀请弹出
    function doInvite(msg) {
        var pvideoBtn = $("#webim_message_video_btn");
        var pRecordBtn = $("#webim_message_record_btn");
        var pInvite = $(".webim-invite");
        var pOnlineUsers = $(".webim-online-users");
        var pRecordUl = $(".webim-record-ul");
        pInvite.children("button").unbind();
        pInvite.children("button").bind("click", function () {
            pvideoBtn.trigger("click");
        });
        if(pRecordBtn.hasClass("active")){
            pInvite.addClass("webim-invite-record");
            pRecordUl.addClass("webim-record-ul-invite");
            pInvite.children("div").html(msg);
            pInvite.show(1000);
        }else{
            pOnlineUsers.addClass("webim-invite-users");
            pInvite.children("div").html(msg);
            pInvite.show(1000);
        }
    }
    function doCloseInvite() {
        var pRecordBtn = $("#webim_message_record_btn");
        var pInvite = $(".webim-invite");
        var pOnlineUsers = $(".webim-online-users");
        var pRecordUl = $(".webim-record-ul");
        if(pRecordBtn.hasClass("active")){
            pInvite.removeClass("webim-invite-record");
            pRecordUl.removeClass("webim-record-ul-invite");
            pInvite.hide(1000);
        }else{
            pOnlineUsers.removeClass("webim-invite-users");
            pInvite.hide(1000);
        }
    }


    function StringBuffer() {
        this._strs = new Array;
    }
    StringBuffer.prototype.append = function (str) {
        this._strs.push(str);
    };
    StringBuffer.prototype.toString = function() {
        return this._strs.join("");
    };

});





























