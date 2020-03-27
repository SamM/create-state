module.exports = function(CreateState){
    CreateState.addResponder('zzzzz', '404 Responder', function(Request, next){
        if(Request.handled) return next();

        Request.response.writeHead(404);
        Request.end('404 - Page Not Found');
        next();
    });
}