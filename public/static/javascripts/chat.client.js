$(function () {
    $( "#datepicker" ).datepicker({
        dateFormat:"yy-mm-dd"
    });
    var paginationOptions={
        pageSize:30
    }
    var webRTC;
    var messageInner = $(".webim-message-box-innner");
    var onlineUsers = $(".webim-online-users");
    var messageSendDiv = $(".webim-message-send-div");
    var messageBox = $(".webim-message-box");
    var count = 0;
    var socket;
    var userId = $("#userId").val();
    var userName = $("#userName").val();
    var userPic = $("#userPic").val();
    var chatType = $("#chatType").val();
    var toUserId = $("#toUserId").val();
    var toUserName = $("#toUserName").val();
    var room = $("#room").val();
    if (!room) {
        room = "default"
    }
    joinRoom(userId, userName, room,userPic);

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
                    doRegxSthAndSend();
                });

                messageSendDiv.keyup(function(event){
                    if(event.altKey && event.keyCode == 13){
                        doRegxSthAndSend();
                    }
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

                $("#webim_message_img_btn").click(function(){
                    $("#webim_file").trigger("click");
                });

                $("#webim_file").change(function(e){
                    try{
                        for(var i = 0; i < e.target.files.length; i++){
                            readImg(e.target.files[i]);
                        }
                    }catch(err){
                        console.log(err)
                        bootbox.alert("该浏览器不支持添加图片功能!");
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
                            pUserBOx.removeClass("webim-online-users-box-invite");
                            pRecoreBox.removeClass("webim-record-box-invite");
                            pInvite.removeClass("webim-invite-record");
                            pUserBOx.show();
                        }else{
                            pOnlineUsers.addClass("webim-invite-users");
                            pRecordUl.removeClass("webim-record-ul-invite");
                            pUserBOx.addClass("webim-online-users-box-invite");
                            pRecoreBox.addClass("webim-record-box-invite");
                            pInvite.removeClass("webim-invite-record");
                            pUserBOx.show();
                        }
                        $(".webim-record-loading").hide();
                        $("#datepicker").val("");
                    }else{
                        $(this).addClass("active");
                        pUserBOx.hide();
                        if(pInvite.is(":hidden")){
                            pInvite.addClass("webim-invite-record");
                            pOnlineUsers.removeClass("webim-invite-users");
                            pUserBOx.removeClass("webim-online-users-box-invite");
                            pRecordUl.removeClass("webim-record-ul-invite");
                            pRecoreBox.removeClass("webim-record-box-invite");
                            pRecoreBox.show();
                        }else{
                            pInvite.addClass("webim-invite-record");
                            pRecordUl.addClass("webim-record-ul-invite");
                            pUserBOx.addClass("webim-online-users-box-invite");
                            pOnlineUsers.addClass("webim-invite-users");
                            pRecoreBox.addClass("webim-record-box-invite");
                            pRecoreBox.show();
                        }
                        $(".webim-record-loading").show();
                        resetPagination();
                        registerAjaxRecord();
                    }

                });

                function doRegxSthAndSend(){
                    var content = messageSendDiv.html();
                    content = content.replace(/<(?!img)[\s\S]*?>/ig," ");
                    content = $.trim(content);
                    console.log(content+"--content");
                    if(!content){
                        bootbox.alert("发送内容不能为空!");
                    }else{
                        socket.emit('broadcast_send_text_msg', {content:content,toUserId:toUserId,toUserName:toUserName,toUserType:chatType});
                        addMessage({user:{userPic:userPic,userName:userName},content:content,time:getTimeStr()},true);
                    }
                    messageSendDiv.html("").focus();
                }

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

    function readImg(file){
        var reader = new FileReader();
        reader.onload = function(){
            appendToMessage( reader.result );
        };
        reader.readAsDataURL(file);
    }

    function appendToMessage(url){
        messageSendDiv.append("<img src='"+url+"' /><br>");
        messageSendDiv.animate({ scrollTop: 9999 });
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
        var pOnlineUsersBox = $(".webim-online-users-box");
        var pRecordUl = $(".webim-record-ul");
        var pRecordBox = $(".webim-record-box");
        pInvite.children("button").unbind();
        pInvite.children("button").bind("click", function () {
            pvideoBtn.trigger("click");
        });
        if(pRecordBtn.hasClass("active")){
            pInvite.addClass("webim-invite-record");
            pRecordUl.addClass("webim-record-ul-invite");
            pRecordBox.addClass("webim-record-box-invite");
            pInvite.children("div").html(msg);
            pInvite.show(1000);
        }else{
            pOnlineUsers.addClass("webim-invite-users");
            pOnlineUsersBox.addClass("webim-online-users-box-invite");
            pInvite.children("div").html(msg);
            pInvite.show(1000);
        }
    }
    function doCloseInvite() {
        var pRecordBtn = $("#webim_message_record_btn");
        var pInvite = $(".webim-invite");
        var pOnlineUsers = $(".webim-online-users");
        var pOnlineUsersBox = $(".webim-online-users-box");
        var pRecordUl = $(".webim-record-ul");
        var pRecordBox = $(".webim-record-box");
        if(pRecordBtn.hasClass("active")){
            pInvite.removeClass("webim-invite-record");
            pRecordUl.removeClass("webim-record-ul-invite");
            pRecordBox.removeClass("webim-record-box-invite");
            pInvite.hide(1000);
        }else{
            pOnlineUsers.removeClass("webim-invite-users");
            pOnlineUsersBox.removeClass("webim-online-users-box-invite");
            pInvite.hide(1000);
        }
    }

    function resetPagination(){
        $(".webim-record-ul").empty();
        $(".pagination").remove();
        $(".webim-pagination-wrapper").append('<div class="pagination"> <a href="" class="first" data-action="first">&laquo;</a> <a href="" class="previous" data-action="previous">&lsaquo;</a> <input type="text" readonly="readonly" /> <a href="" class="next" data-action="next">&rsaquo;</a> <a href="" class="last" data-action="last">&raquo;</a></div>');
    }

    $( "#datepicker").change(function(){
        if(!$(this).is(":hidden")){
            resetPagination();
            registerAjaxRecord();
        }
    });
    function registerAjaxRecord(){
        var pRecordUl = $(".webim-record-ul");
        var openPrivateMsg = {};
        if(chatType=="user"){
            openPrivateMsg.fromUserId = userId;
            openPrivateMsg.toUserId = toUserId;

        }else{
            openPrivateMsg.toUserId=toUserId;
        }
        if($( "#datepicker").prop("value")){
            openPrivateMsg.createTime=$( "#datepicker").prop("value");
        }
        var jqxhr = $.post("record", {page: '{pageSize:'+paginationOptions.pageSize+'}', openPrivateMsg: JSON.stringify(openPrivateMsg)},"json");
        jqxhr.success(function(data){
            $(".webim-record-loading").hide()
            $('.pagination').jqPagination({
                max_page	: data.TotalPages,
                paged		: function(page) {
                    $(".webim-record-ul").empty();
                    $(".webim-record-loading").show();
                    var jqxhrInner =  $.post("record", {page: '{pageSize:'+paginationOptions.pageSize+',pageNo:'+page+'}', openPrivateMsg: JSON.stringify(openPrivateMsg)},function(data){
                        $.each(data.rows,function(index, value){
                            pRecordUl.append('<li><h6>'+value.fromUserName+' <span class="time">'+value.createTime+'</span></h6>'+value.msgContent+'</li>');
                        });
                        $(".webim-record-loading").hide();
                    },"json");
                    jqxhrInner.error(function(){
                        bootbox.alert("出现错误,请稍后重试");
                        $("#webim_message_record_btn").trigger("click");
                    });
                }
            });
            $.each(data.rows,function(index, value){
                pRecordUl.append('<li><h6>'+value.fromUserName+' <span class="time">'+value.createTime+'</span></h6>'+value.msgContent+'</li>');
            });
        });
        jqxhr.error(function(){
            bootbox.alert("出现错误,请稍后重试");
            $("#webim_message_record_btn").trigger("click");
        });
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





























