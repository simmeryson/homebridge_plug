var net = require('net');
var fs = require('fs');

var sock_path = '/Users/guokai/bbbbbb.sock';
if(fs.existsSync(sock_path)) {
    fs.unlinkSync(sock_path, function(err) {
        console.log('delete err: ' + err.toString());
    });
}

net.createServer(function(sock){
    sock.on('connect', ()=>{
        console.log('connected!');
    });
    sock.on('data',function(data){
        console.log('Server rev: '+ data.toString());
        sock.write('Hi, client!');
    });
}).listen(sock_path, ()=>{
    console.log('listening...');
});