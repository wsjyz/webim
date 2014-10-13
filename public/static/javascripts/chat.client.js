/**
 * Created by dam on 2014/9/13.
 */

var msg_template = '<p><span class="msg-block"><strong></strong><span class="time"></span><span class="msg"></span></span></p>';
var widget_chat = $('.widget-chat');
var messages = $('#chat-messages');
var message_box = $('.chat-message');
var message_box_input = $('.chat-message textarea');
var messages_inner = $('#chat-messages-inner');
var htmlEleId = 0;
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

function joinRoom(name,room){
    $('#userName').val(name);
    socket = io('http://localhost:3002/');//192.168.1.61 115.29.47.23 webim.izhuangyuan.cn
    socket.emit('join', {username:name, room:room});
    socket.on('broadcast_join', function(data){//监听加入事件
        var userList = data.userList;
        var joinName = data.joinName;
        if(userList){
            htmlEleId = htmlEleId + 1;
            var id = 'msg-'+htmlEleId;
            messages_inner.append('<p class="offline al" id="'+id+'"><span>用户 <a href="#">@'+joinName+'</a> 加入</span></p>');
            $('#'+id).fadeOut(0).addClass('show');

            $('.contact-list').empty();
            var list_content = new StringBuffer();

            for(var i = 0;i < userList.length;i++){
                if(userList[i].userName != '' && userList[i].userName != null){
                    list_content.append('<li id="user-'+userList[i].socketId+'" class="online">' +
                        '<a href="#" class="pull-left"><img alt="" src="/static/images/av2.jpg" />' +
                        ' <span>'+userList[i].userName+'</span></a>' +
                        '</a>' +
                        '<div class="clearfix"></div></li>');
                }
            }
            $('.contact-list').append(list_content.toString());
        }

    });
    socket.on('broadcast_say', function(msg){//监听聊天事件
        add_message(msg.username+':','/static/images/av2.jpg',msg.text,true);
    });
    socket.on('broadcast_blob', function(msg){//监听聊天事件
        add_message(msg.username+':','/static/images/av2.jpg','<img src="' + msg.blob_message + '"/>',true);
    });
    socket.on('broadcast_quit', function(msg){//监听聊天事件
        if(msg){
            remove_user(msg.userId,msg.username);
        }
    });

}
//发送消息
$('.chat-message button').click(function(){
    //var input = $(this).parent().siblings('input[type=textarea]');
    var input = $('.chat-message textarea');
    if(input.val() != ''){
        socket.emit('say', {text:input.val()});
//        add_message('你:','/static/images/av1.jpg',input.val(),true);
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
//            add_message('你:','/static/images/av1.jpg',$(this).val(),true);
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
    if(hours < 10) hours = '0' + hours;
    if(minutes < 10) minutes = '0' + minutes;
    var id = 'msg-'+htmlEleId;
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
    htmlEleId = htmlEleId + 1;
    $('.contact-list li#user-'+userid).addClass('offline').delay(1000).slideUp(800,function(){
        $(this).remove();
    });
    var id = 'msg-'+htmlEleId;
    messages_inner.append('<p class="offline al" id="'+id+'"><span>用户 <a href="#">@'+name+'</a> 离开了</span></p>');
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
                add_message('你:','/static/images/av1.jpg',sHtml,true);
                socket.emit('send_blob', event.target.result);
            }
            reader.readAsDataURL(blob);//用fileReader读取二进制图片，完成后会调用上面定义的回调函数
        }
    }
}

$("#joinVideo").click(function(){
   $(this).prop("disabled", true).addClass("disabled");
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
        webrtc.joinRoom(room);
    });
});


//function agreeVideoRequest(needAgreeSocketId,whoAgreeSocketId){
//
//}

