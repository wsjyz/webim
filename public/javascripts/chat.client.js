/**
 * Created by dam on 2014/9/13.
 */

var msg_template = '<p><span class="msg-block"><strong></strong><span class="time"></span><span class="msg"></span></span></p>';
var widget_chat = $('.widget-chat');
var messages = $('#chat-messages');
var message_box = $('.chat-message');
var message_box_input = $('.chat-message textarea');
var messages_inner = $('#chat-messages-inner');

var webrtc;

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

function joinRoom(name){
    $('#userName').val(name);
    socket = io('http://115.29.47.23:3002');
    socket.emit('join', {username:name});
    socket.on('broadcast_connected', function(msg){//监听加入事件
    });
    socket.on('broadcast_join', function(userList){//监听加入事件
        if(userList){
            $('.contact-list').empty();
            var list_content = new StringBuffer();

            for(var i = 0;i < userList.length;i++){
                if(userList[i].userName != '' && userList[i].userName != null){
                    var cameraHtml= '';
                    if(userList[i].socketId != socket.io.engine.id){
                        cameraHtml =  '<a href="javascript:sendVideoRequest(\''+socket.io.engine.id+'\',\''+userList[i].socketId+'\',\''+userList[i].userName+'\');" class="pull-right">' +
                            '<img alt="" src="/images/camera.png" style="width: 16px;height: 16px;margin-top: 4px;" />';
                    }
                    list_content.append('<li id="user-'+userList[i].socketId+'" class="online">' +
                        '<a href="#" class="pull-left"><img alt="" src="/images/av2.jpg" />' +
                        ' <span>'+userList[i].userName+'</span></a>' +cameraHtml+
                        '</a>' +
                        '<div class="clearfix"></div></li>');
                }
            }
            $('.contact-list').append(list_content.toString());
        }

    });
    socket.on('broadcast_say', function(msg){//监听聊天事件
        add_message(msg.username+':','/images/av2.jpg',msg.text,true);
    });
    socket.on('broadcast_blob', function(msg){//监听聊天事件
        add_message(msg.username+':','/images/av2.jpg','<img src="' + msg.blob_message + '"/>',true);
    });
    socket.on('broadcast_quit', function(msg){//监听聊天事件
        if(msg){
            remove_user(msg.userId,msg.username);
        }
    });
    socket.on('video_invite', function(msg){//监听聊天事件
        if(msg){
            add_message(msg.fromUserName+'向你发来视频邀请','/images/av2.jpg',
                    '<a class="agree_a" data-needagreesocketId="'+msg.fromSocketId+'"  data-whoagreesocketId="'+msg.toSocketId+'"  href="javascript:;">接受</a>',true);
        }
    });
    socket.on('video_invite_agree', function(msg){//监听同意视频事件
        i = i + 1;
        var id = 'msg-'+i;
        messages_inner.append('<p class="offline al" id="'+id+'"><span>'+msg+'接受了你的视频请求</span></p>');
        $('#'+id).fadeOut(0).addClass('show');
        webrtc = new SimpleWebRTC({
            // the id/element dom element that will hold "our" video
            localVideoEl: 'localVideo',
            // the id/element dom element that will hold remote videos
            remoteVideosEl: 'remoteVideos',
            // immediately ask for camera access
            autoRequestMedia: true
        });
        webrtc.on('readyToCall', function () {
            // you can name it anything
            webrtc.joinRoom('your awesome room name');
        });
    });
}
//发送消息
$('.chat-message button').click(function(){
    //var input = $(this).parent().siblings('input[type=textarea]');
    var input = $('.chat-message textarea');
    if(input.val() != ''){
        socket.emit('say', {text:input.val()});
        add_message('你:','/images/av1.jpg',input.val(),true);
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
            socket.emit('say', {text:$(this).val()});
            add_message('你:','/images/av1.jpg',$(this).val(),true);
        } else {
            $('.input-box').addClass('has-error');
        }
    }
});
var i = 0;
function add_message(name,img,msg,clear) {

    i = i + 1;

    var time = new Date();
    var hours = time.getHours();
    var minutes = time.getMinutes();
    if(hours < 10) hours = '0' + hours;
    if(minutes < 10) minutes = '0' + minutes;
    var id = 'msg-'+i;
    var idname = name.replace(' ','-').toLowerCase();
    messages_inner.append('<p id="'+id+'" class="user-'+idname+'"><img class="head-pic" src="'+img+'" alt="" />'
        +'<span class="msg-block"><strong>'+name+'</strong> <span class="time">- '+hours+':'+minutes+'</span>'
        +'<span class="msg">'+msg+'</span></span></p>');
    $('#'+id).fadeOut(0).addClass('show');
    if(clear) {
        $('.input-box').removeClass('has-error');
        message_box_input.val('').focus();

    }
    messages.animate({ scrollTop: messages_inner.height() },1000);

    messages.getNiceScroll().resize();
}

function remove_user(userid,name) {
    i = i + 1;
    $('.contact-list li#user-'+userid).addClass('offline').delay(1000).slideUp(800,function(){
        $(this).remove();
    });
    var id = 'msg-'+i;
    messages_inner.append('<p class="offline al" id="'+id+'"><span>User <a href="#">@'+name+'</a> 离开了</span></p>');
    $('#'+id).fadeOut(0).addClass('show');
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
                var sHtml='<img class="msg-send" src="'+event.target.result+'">';//result应该是base64编码后的图片
//                document.getElementById('dd').innerHTML += sHtml;
                add_message('你:','/images/av1.jpg',sHtml,true);
                socket.emit('send_blob', event.target.result);
            }
            reader.readAsDataURL(blob);//用fileReader读取二进制图片，完成后会调用上面定义的回调函数
        }
    }
}

function sendVideoRequest(fromSocketId,toSocketId,toUserName){
    var fromUserName = $('#userName').val();
    socket.emit('video_invite', {fromSocketId:fromSocketId,fromUserName:fromUserName,toSocketId:toSocketId,toUserName:toUserName});
    i = i + 1;
    var id = 'msg-'+i;
    console.log();
    messages_inner.append('<p class="offline al" id="'+id+'"><span>你向'+toUserName+'发送了视频请求</span></p>');
    $('#'+id).fadeOut(0).addClass('show');
}
$(document).ready(function(){
    $(".chat-messages").on('click','.agree_a',function(){

        socket.emit('video_invite_agree', {needAgreeSocketId:$(this).attr('data-needagreesocketId'),whoAgreeSocketId:$(this).attr('data-whoagreesocketId')});
        $(this).replaceWith('接受');
        webrtc = new SimpleWebRTC({
            // the id/element dom element that will hold "our" video
            localVideoEl: 'localVideo',
            // the id/element dom element that will hold remote videos
            remoteVideosEl: 'remoteVideos',
            // immediately ask for camera access
            autoRequestMedia: true
        });
        webrtc.on('readyToCall', function () {
            // you can name it anything
            webrtc.joinRoom('your awesome room name');
        });
    });
});
//function agreeVideoRequest(needAgreeSocketId,whoAgreeSocketId){
//
//}

