const fs = require('fs');
const dir = require('path').join(__dirname, '../images');

module.exports = function(CreateState){
    CreateState.addResponder(0, 'Favicon Responder', function(Request, next){
        if(Request.filename === '/favicon.ico'){
            if(Request.method !== 'GET'){
                Request.setStatus(501);
                Request.setHeader('Content-Type', 'text/plain');
                Request.end('Method not implemented');
                return next();
            }
            
            let stream = fs.createReadStream(dir+'/favicon.ico');
            stream.on('open', function () {
                Request.setHeader('Content-Type', 'image/x-icon');
                stream.pipe(Request.response);
            });
            stream.on('end', function(){
                Request.end();
                next();
            });
            stream.on('error', function (error) {
                console.log('Error serving favicon', error);
                Request.setHeader('Content-Type', 'text/plain');
                Request.setStatus(404);
                Request.end('404 - Page Not Found');
                next();
            });
        }
        else next();
    });
}