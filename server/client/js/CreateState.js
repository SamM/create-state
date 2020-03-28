var CreateState = (function(){
    let llac = function(returnOnce){
        function callback(listener){
            if(typeof listener == 'function'){
                callback.listeners.push(listener);
                if(callback.done){
                    listener.call(callback.scope, callback.result);
                }
            }
            return callback;
        }
        callback.done = false;
        callback.listeners = [];
        callback.scope = this;
        callback.result = null;
        callback.return = function(value){
            if(returnOnce && callback.done) return;
            callback.result = value;
            callback.done = true;
            if(callback.listeners.length){
                callback.listeners.forEach(function(listener){
                    listener.call(callback.scope, callback.result);
                })
            }
        };
        return callback;
    };

    function CreateState(){

    }
    CreateState.Data = Matrix();
    CreateState.MetaData = Matrix();

    CreateState.sendPostData = function(url, data){
        let urlEncodedData = "",
            urlEncodedDataPairs = [],
            name,
            callback = llac();

        // Turn the data object into an array of URL-encoded key/value pairs.
        for( name in data ) {
            urlEncodedDataPairs.push( encodeURIComponent( name ) + '=' + encodeURIComponent( data[name] ) );
        }

        // Combine the pairs into a single string and replace all %-encoded spaces to 
        // the '+' character; matches the behaviour of browser form submissions.
        urlEncodedData = urlEncodedDataPairs.join( '&' );

        console.log('Send Data:');
        console.log(urlEncodedData);

        const http = new XMLHttpRequest();
        // Define what happens on successful data submission
        http.addEventListener( 'load', function(event) {
            callback.return(null, http.responseText+"");
        } );

        // Define what happens in case of error
        http.addEventListener( 'error', function(event) {
            console.log(http.responseText);
            callback.return(event);
        });

        // Set up our request
        http.open( 'POST', url );

        // Add the required HTTP header for form data POST requests
        http.setRequestHeader( 'Content-Type', 'application/x-www-form-urlencoded' );

        // Finally, send our data.
        http.send( urlEncodedData );

        return callback;
    }

    // Data used by update function
    CreateState.baseURL = '/';
    CreateState.pathSeperator = '.';
    CreateState.DATA_API = 'data';
    CreateState.METADATA_API = 'metadata';

    CreateState.update = function(path, forceReload, skip){
        let callback = llac(true);
        
        if(typeof path !== 'string' && typeof path !== 'number' && !Array.isArray(path)){
            throw new Error('Path must be a string / number / Array');
        }
        if(typeof path === 'number') path = path+'';
        if(typeof path === 'string') path = path.split('.');

        if(!Array.isArray(skip)) skip = [];

        // Don't do update if path in the skip list
        if(skip.indexOf(path.join('.')) > -1){
            callback.return(CreateState.Data().go(path));
            return callback;
        }

        function updateMetaData(metadata){
            let http = new XMLHttpRequest();
        
            http.addEventListener('load', function(response){
                if(http.responseType == 'text'){
                    response = http.responseText+"";
                }else{
                    response = http.responseText;
                }
                try{
                    response = JSON.parse(response);
                }catch(ex){
                    console.log('Error parsing metadata:', path.join(CreateState.pathSeperator));
                    response = {};
                }
                
                CreateState.MetaData().build(path).set(response);
                updateDependencies();
            });
            http.open('GET', CreateState.baseURL + CreateState.METADATA_API + '?' + path.join(CreateState.pathSeperator));
            http.setRequestHeader('Accept', 'text/json');
            http.send();
        }
        function updateDependencies(){
            let depend = CreateState.MetaData().go(path).get();
            if(typeof depend !== 'object' || depend === null){
                depend = [];
            }else{
                depend = depend.dependencies || [];
            }
            if(depend.length == 0){
                // No dependencies -> load data
                updateData();
                return;
            }
            skip.push(path);
            let loaded = 0;
            function done(){
                loaded++;
                if(loaded > depend.length){
                    // All dependencies loaded -> load data
                    updateData();
                }else{
                    function allBut(dep){
                        return dep !== depend[loaded-1];
                    }
                    // Load dependency
                    CreateState.update(depend[loaded-1], forceReload, skip.concat(depend.filter(allBut)))(done);
                }
            }
            done();
        }
        function updateData(){
            let http = new XMLHttpRequest();
        
            http.addEventListener('load', function(str){
                if(http.responseType == 'text'){
                    str = http.responseText+"";
                }else{
                    str = http.responseText;
                }
                let value = null;
                let metadata = CreateState.MetaData().go(path).get() || {};
                switch(metadata.type){
                    case 'function':
                        let comments = /\/\*[\s\S]*?(?=\*\/)*\*\/|\/\/[^\n\r]*[\n\r]+/g;
                        //str = str.split(comments).join('');
                        
                        /// The following is taken from: https://gist.github.com/lamberta/3768814
                        var fn_body_idx = str.indexOf('{'),
                        fn_body = str.substring(fn_body_idx+1, str.lastIndexOf('}')),
                        fn_declare = str.substring(0, fn_body_idx),
                        fn_params = fn_declare.substring(fn_declare.indexOf('(')+1, fn_declare.lastIndexOf(')')),
                        args = fn_params.split(',');
            
                        args.push(fn_body);
            
                        function Fn () {
                            return Function.apply(this, args);
                        }
                        Fn.prototype = Function.prototype;

                        value = new Fn();
                        break;
                    case 'string':
                        value = str;
                        break;
                    case 'number':
                        value = parseFloat(str);
                        break;
                    case 'switch':
                        str = str.toLowerCase();
                        value = str === 'true' || str === '1' || str === 'yes' || str === 'on' ? true : str === 'false' || str === '0' || str === 'no' || str === 'off' ? false : null;
                        break;
                    case 'object':
                        try{
                            value = JSON.parse(str);
                        }catch(e){
                            value = str;
                        }
                        break;
                    case 'array':
                        try{
                            value = JSON.parse(str);
                        }catch(e){
                            value = str;
                        }
                        break;
                    default:
                        callback.return(CreateState.Data().go(path));
                        return;
                        break;
                }
                callback.return(CreateState.Data().build(path).set(value));
            });
            http.open('GET', CreateState.baseURL + CreateState.DATA_API + '?' + path.join(CreateState.pathSeperator));
            http.setRequestHeader('Accept', 'text/*');
            http.send();
        }
        if(!CreateState.MetaData().exists(path) || CreateState.MetaData().go(path).get() === null || forceReload){
            // Start by updating the MetaData
            updateMetaData();
            // Then load Dependencies
            // Then load Data
        }else if(!CreateState.Data().exists(path) || CreateState.Data().go(path).get() === null || forceReload){
            // Load Depenencies
            updateDependencies();
            // Then load Data
        }else{
            // Don't update
            callback.return(CreateState.Data().go(path));
        }
        return callback;
    }
    return CreateState;
})();