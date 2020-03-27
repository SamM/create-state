const requestListener = function (req, res) {
  res.writeHead(200);
  res.end('Hello, World!');
}

const http = require('http');
const llac = require('./src/llac');

function CreateState(port, cleanupRequests){
    this.version = '0.1';
    this.port = typeof port == 'number' ? port : 8080;
    this.server = null;
    this.requests = {};
    this.responders = {};
    this.adapters = [];
    this.clearRequestOnceHandled = !!cleanupRequests;
    this.setup();
}

        CreateState.Responder = function(name, respond){
            this.respond = typeof respond == 'function' ? respond : function(Request, next){ next() };
            this.name = name;
        }

        CreateState.RequestID = 0;
        CreateState.Request = function(request, response){
            this.request = request;
            this.response = response;
            this.handled = false;
            this.statusCode = null;
            this.headers = {};
            this.interpret(request);
        }

        with(proto = CreateState.Request.prototype)
        {
            proto.interpret = function(req){
                this.domain = req.headers.host.split(':')[0].split('/')[0].split('.');
                this.method = req.method;
                this.path = req.url;
                this.filename = this.path.split('?')[0].split('#')[0];
                this.query = this.path.indexOf('?') > -1 ? this.path.split('?').slice(1).join('?') : '';
                this.query = this.query.split('#')[0];
                this.hash = this.path.indexOf('#') > -1 ? this.path.split('#').slice(1).join('#') : '';
                let params = {};
                this.query.split('&').forEach(function(param){
                    if(param == '') return;
                    let key, value = true;
                    if(param.indexOf('=') > -1){
                        key = param.split('=')[0];
                        value = param.split('=').slice(1).join('=');
                        if(value.search(/[^0-9\.]+/) == -1 && value.split('.').length < 3){
                            value = parseFloat(value);
                        }
                        if(value == 'true') value = true;
                        if(value == 'false') value = false;
                    }else{
                        key = param;
                    }
                    if(typeof key == 'string'){
                        params[key] = value;
                    }
                })
                this.params = params;
            };
            proto.setHeader = function(header, value){
                this.headers[header] = value;
                this.response.setHeader(header, value);
                return this;
            };
            proto.setStatus = function(statusCode){
                this.statusCode = statusCode;
                this.response.statusCode = statusCode;
                return this;
            };
            proto.end = function(data){
                if(this.handled) return this;
                this.response.end(data);
                this.handled = true;
                return this;
            }
        }

with(proto = CreateState.prototype)
{
    proto.handleRequest = function(request, response){
        let Request = new CreateState.Request(request, response);
        let RequestID = ++CreateState.RequestID;
        Request.ID = RequestID;
        let scope = this;

        this.requests[RequestID] = Request;

        this.generateResponse(Request);
    };
    proto.adapt = function(plugin){
        if(typeof plugin != 'string') throw new Error('First argument must be the path to the plugin file (type string)');
        if(plugin.indexOf('.') == 0 || plugin.indexOf('/') == 0){
            // Path not filename
        }else{
            // Use default path
            plugin = './'+plugin;
        }
        let adapter = require(plugin);
        if(typeof adapter == 'function'){
            this.adapters.push(adapter);
            adapter.call(this, this);
        }
        return this;
    };
    proto.generateResponse = function(Request){
        let response_queue;
        let respond_order = Object.keys(this.responders).sort();
        let scope = this;
        let priority = 0;
        let queue_index = 0;
        let last_responder = 'None';

        function getQueue(i){
            return scope.responders[respond_order[i]];
        }

        function nextOnce(){
            let done = false;
            return function(){
                if(done) return;
                done = true;
                next();
            };
        }

        function next(){
            let date = (new Date()).toUTCString();
            if(Request.handled){
                // Log request handled
                console.log('');
                console.log(Request.domain.join('.') + Request.path, '\n: Served by', last_responder, '\n@ UTC', date);
                if(scope.clearRequestOnceHandled){
                    delete scope.requests[Request.ID];
                }
                return;
            }
            if(priority >= respond_order.length){
                Request.setStatus(404);
                Request.end('404 - Page Not Found');
                console.log('');
                console.log(Request.domain.join('.') + Request.path, '\n: 404 Page Not Found \n@ UTC', date);
                return;
            }
            let queue = getQueue(priority);
            if(queue.length == 0 || queue_index >= queue.length){
                priority++;
                queue_index = 0;
                return next();
            }
            if(!(queue[queue_index] instanceof CreateState.Responder)){
                queue_index++;
                if(queue_index >= queue.length){
                    priority++;
                    queue_index = 0;
                }
                return next();
            }
            let responder = queue[queue_index++];
            last_responder = responder.name;
            responder.respond.call(scope, Request, nextOnce());
        }
        next();
    };
    proto.addResponder = function(order, name, responder){
        if(typeof order != 'number' && typeof order != 'string'){
            throw new Error('First argument must be of type string or number');
        }
        if(typeof name != 'string'){
            throw new Error('Second argument must be of type string');
        }
        if(typeof responder != 'function'){
            throw new Error('Third argument must be of type function');
        }

        if(typeof this.responders[order] == 'undefined'){
            this.responders[order] = [];
        }
        if(Array.isArray(this.responders[order])){
            this.responders[order].push(new CreateState.Responder(name, responder));
        }
        return this;
    };
    proto.setPort = function(port){
        if(typeof port == 'number'){
            this.port = port;
        }
        return this;
    }
    proto.startServer = function(port){
        port = (typeof port == 'number' ? port : typeof this.port == 'number' ? this.port : 8080);
        this.server = http.createServer(this.handleRequest.bind(this));
        this.server.listen(port);
        console.log('CreateState : version '+this.version);
        console.log('Server started successfully on port '+port);
        return this;
    }
    proto.setup = function(){

    };
}

var module;
if(typeof module == 'object'){
    module.exports = CreateState;
}