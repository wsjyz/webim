/**
 * Created by dam on 2014/9/13.
 */

var msg_template = '<p><span class="msg-block"><strong></strong><span class="time"></span><span class="msg"></span></span></p>';
var widget_chat = $('.widget-chat');
var messages = $('#chat-messages');
var message_box = $('.chat-message');
var message_box_input = $('.chat-message #msg-div');
var messages_inner = $('#chat-messages-inner');
var htmlEleId = 0;
var isRegTriggerClickMedio = false;
var webrtc;
var userId = new Date().getTime();
var room = window.location.hash.slice(1);
if(!room){
    room = "default"
}
$(function(){
    bootbox.prompt("请输入昵称", function(result) {
        if (result === null) {
            return false;
        } else {
            joinRoom(result,room,userId);
        }
    });
});

function StringBuffer() {
    this._strs = new Array;
}
StringBuffer.prototype.append = function (str) {
    this._strs.push(str);
};
StringBuffer.prototype.toString = function() {
    return this._strs.join("");
};

var socket;

function joinRoom(name,room,userId){
    $('#userName').val(name);
    socket = io('http://localhost:3002/');//192.168.1.61 115.29.47.23 webim.izhuangyuan.cn
    socket.emit('join_room', {userName:name, roomId:room, userId:userId});
    socket.on('broadcast_join_room', function(data){//监听加入事件
        var mediaType = data.mediaType;
        if(mediaType){
            if(isRegTriggerClickMedio == false){
                isRegTriggerClickMedio = true;
                doPanelMessage(mediaType, data.panelMessage);
            }
        }
        var userList = data.userList;
        if(userList){
            $('.contact-list').empty();
            var list_content = new StringBuffer();

            for(var i = 0;i < userList.length;i++){
                if(userList[i].userName != '' && userList[i].userName != null){
                    list_content.append('<li id="user-'+userList[i].socketId+'" class="online">' +
                        '<a  class="pull-left"><img alt="" src="/static/images/av2.jpg" />' +
                        ' <span>'+userList[i].userName+'</span></a>' +
                        '</a>' +
                        '<div class="clearfix"></div></li>');
                }
            }
            $('.contact-list').append(list_content.toString());
        }

    });
    socket.on('broadcast_send_text_msg', function(msg){//监听聊天事件
        add_message(msg.userName+':','/static/images/av2.jpg',msg.content,true);
    });
    socket.on('broadcast_send_blob_msg', function(msg){//监听聊天事件
        add_message(msg.userName+':','/static/images/av2.jpg','<img src="' + msg.blob_message + '"/>',true);
    });
    socket.on('broadcast_quit_room', function(msg){//监听聊天事件
        if(msg){
            remove_user(msg.userId,msg.userName);
        }
    });
    socket.on('broadcast_join_rtc_room', function (msg) {
        //监听加入音视频
        if(isRegTriggerClickMedio == false){
            isRegTriggerClickMedio = true;
            doPanelMessage(msg.mediaType, msg.panelMessage);
        }else{
            $(".panel-message-content").html( msg.panelMessage);
        }
        add_notice_message(msg.user.userName, msg.mediaType=="video"?"进入视频聊天":"进入音频聊天");
    });

}
//发送消息
$('#sendBtn').click(function(){
    var msgDiv = $('#msg-div');
    var htmlMsg = msgDiv.html();
    if(htmlMsg != ''){
        socket.emit('broadcast_send_text_msg', {content:htmlMsg});
    } else {
        $('.input-box').addClass('has-error');
    }
});

messages.niceScroll({
    zindex: 1060
});

message_box_input.keypress(function(e){
    if($(this).val() != '') $('.input-box').removeClass('has-error');
    if(e.which == 13) {
        if($(this).val() != ''){
            socket.emit('broadcast_send_text_msg', {content:$(this).val()});
        } else {
            $('.input-box').addClass('has-error');
        }
    }
});

function add_message(name,img,msg,clear) {

    htmlEleId = htmlEleId + 1;

    var time = new Date();
    var hours = time.getHours();
    var minutes = time.getMinutes();
    var seconds = time.getSeconds();
    if(hours < 10) hours = '0' + hours;
    if(minutes < 10) minutes = '0' + minutes;
    if(seconds<10)seconds = "0" + seconds;
    var id = 'msg-'+htmlEleId;
    var idname = name.replace(' ','-').toLowerCase();
    messages_inner.append('<p id="'+id+'" class="user-'+idname+'"><img class="head-pic" src="'+img+'" alt="" />'
        +'<span class="msg-block"><strong>'+name+'</strong> <span class="time">- '+hours+':'+minutes+":"+seconds+'</span>'
        +'<span class="msg">'+msg+'</span></span></p>');
    $('#'+id).fadeOut(0).addClass('show');
    if(clear) {
        $('.input-box').removeClass('has-error');
        message_box_input.html('').focus();

    }
    messages.animate({ scrollTop: messages_inner.height() },1000);

    messages.getNiceScroll().resize();
}

function remove_user(userid,name) {
    $('.contact-list li#user-'+userid).addClass('offline').delay(1000).slideUp(800,function(){
        $(this).remove();
    });
    add_notice_message(name,"离开了");
}

function add_notice_message(name,eventName) {
    htmlEleId = htmlEleId + 1;
    var id = 'msg-'+htmlEleId;
    messages_inner.append('<p class="offline al" id="'+id+'"><span>用户 <a >@'+name+'</a> '+eventName+'</span></p>');
    $('#'+id).fadeOut(0).addClass('show');
    messages.animate({ scrollTop: messages_inner.height() },1000);
    messages.getNiceScroll().resize();
}

function pasteClob(evt){
    //for chrome
    var clipboardData = evt.clipboardData;
    for(var i=0; i<clipboardData.items.length; i++){
        var item = clipboardData.items[i];
        if(item.kind=='file'&&item.type.match(/^image\//i)){
            //blob就是剪贴板中的二进制图片数据
            var blob = item.getAsFile(),reader = new FileReader();
            //定义fileReader读取完数据后的回调
            reader.onload=function(){
                var sHtml='<img src="'+event.target.result+'">';//result应该是base64编码后的图片
                  message_box_input.append($(sHtml));
                //socket.emit('broadcast_send_blob_msg', event.target.result);
            }
            reader.readAsDataURL(blob);//用fileReader读取二进制图片，完成后会调用上面定义的回调函数
        }
    }
}

$("#joinVideoBtn").click(function(){
    $(".invite-div").hide();
    $(this).prop("disabled", true).addClass("disabled");
    $("#joinAudioBtn").prop("disabled", true).addClass("disabled");
    webrtc = new SimpleWebRTC({
        localVideoEl: 'localVideo',
        remoteVideosEl: 'remoteVideos',
        autoRequestMedia: true
    });
    webrtc.on('readyToCall', function () {
        // you can name it anything
        webrtc.joinRoom(room);
        socket.emit("broadcast_join_rtc_room",{mediaType:"video"})
    });
});

$("#joinAudioBtn").click(function(){
    $(".invite-div").hide();
    $(this).prop("disabled", true).addClass("disabled");
    $("#joinVideoBtn").prop("disabled", true).addClass("disabled");
    webrtc = new SimpleWebRTC({
        localVideoEl: 'localVideo',
        remoteVideosEl: 'remoteVideos',
        autoRequestMedia: true,
        media: {
            video: false,
            audio: true
        }
    });
    webrtc.on('readyToCall', function () {
        webrtc.joinRoom(room);
        socket.emit("broadcast_join_rtc_room",{mediaType:"audio"})
    });
});
$("#chatRecordBtn").click(function(){
    var pThis = $(this);
    var pChatRecord = $("#chatRecord");
    if(pThis.hasClass("active")){
        pThis.removeClass("active");
        pChatRecord.removeClass("chat-record");
    }else{
        pThis.addClass("active");
        pChatRecord.addClass("chat-record");
    }

});

function doPanelMessage(mediaType, panelMessage){
    $(".panel-message-content").html(panelMessage);
    if(!$("#localVideo").prop("src")){
        $(".invite-div").show(1000);
        if(mediaType == "video"){
            $(".panelMessageBtn").click(function(){
                $("#joinVideoBtn").trigger("click");
            });
        }else{
            $(".panelMessageBtn").click(function(){
                $("#joinAudioBtn").trigger("click");
            })
        }
    }
}
