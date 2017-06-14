var net = require('net');
var fs = require('fs');

// var sock_path = '/Users/guokai/bbbbbb.sock';
// var sock_path = '\0com.gk.kkk"';
var sock_ip = "127.0.0.1";
var sock_port = "5349";
if(fs.existsSync(sock_path)) {
    fs.unlinkSync(sock_path, function(err) {
        console.log('delete err: ' + err.toString());
    });
}

var server = net.createServer(function(sock){
    sock.on('connect', ()=>{
        console.log('connected!');
    });
    sock.on('data',function(data){
        console.log('Server rev: '+ data.toString());
        sock.write('Hi, client!');
    });
});
server.listen(sock_port, ()=>{
    console.log('listening...'+ server.address());
})