function Matrix(name, above, top){

    // Value Stored at this Node
    let STORE = null;

    function Node(){
        return Access;
    }

    if(typeof name !== 'string'){
        name = '';
    }
    if(typeof above !== 'function'){
        above = Node;
    }
    if(typeof top !== 'function'){
        Node['...'] = Node;
        top = above['...'];
    }

    // Root of the Matrix
    Node['...'] = top;
    // Parent Node of this Node
    Node['..'] = above;
    // Address of this node within the Root Matrix
    Node['.'] = '';
    Node['.'] = above['.'] === '' ? name : [above['.'], name].join(Matrix.seperator);
    // Name of this node within the Parent Node
    Node[''] = name;
    
    function Access(){
        return Node;
    }
    Access.top = function(){
        return Node['...'](); // Access function
    };
    Access.root = Access.base = Access.top;
    Access.up = function(){
        return Node['..'](); // Access function
    };
    Access.address = function(){
        return Node['.']; // typeof string
    }
    Access.name = function(){
        return Node['']; // typeof string
    };
    Access.set = function(value){
        // No value given -> exit
        if(arguments.length == 0) return Access; // Access function
        // Update Storage Variable with new value
        // If it is a function -> bind to this node's Access helper
        // To give the function access to this Matrix
        if(typeof value === 'function'){
            function proxy(){
                let args = [].slice.call(arguments);
                return proxy.source.apply(Access, args);
            };
            proxy.source = value;
            STORE = proxy;
        } 
        else STORE = value;
        
        return Access; // Access function
    };
    Access.get = function(path){
        // .get() -> return own storage variable
        if(arguments.length == 0)
            return STORE; // Variable
        
        // If path is a list -> go to node and return their storage variable
        if(typeof path === 'string' || typeof path === 'number' || Array.isArray(path)){
            return Access.go(path).get(); // Variable
        }
        // Unknown path type -> return own storage variable
        return STORE; // Variable
    };
    Access.exists = function(path){
        if(typeof path === 'string' || typeof path === 'number'){
            path = path+'';
            path = path.split(Matrix.seperatorRegexp);
        }
        else if(!Array.isArray(path)) throw new Error( 'Path must be a string or Array');

        let node;
        let step = path[0];

        if(path.join('.') === '.'){
            return true;
        }else if(step === ''){
            node = Node['..']
        }else{
            if(typeof step !== 'string') throw new Error( 'Path array must only contain strings');
            step = step.split(Matrix.unallowedCharacterRegexp).join('');
            if(step !== ''){
                if(typeof Node[step] === 'function'){
                    node = Node[step]
                }else{
                    return false;
                }
            }else{
                node = Node;
            }
        }
        if(path.length == 1) return true; // Access function
        return node().exists(path.slice(1)); // Access function
    };
    Access.build = function(path){ 
        if(typeof path === 'string' || typeof path === 'number'){
            path = path+'';
            path = path.split(Matrix.seperatorRegexp);
        }
        else if(!Array.isArray(path)) throw new Error( 'Path must be a string or Array');

        let node;
        let step = path[0];

        if(path.join('.') === '.'){
            return Node['..']();
        }else if(step === ''){
            node = Node['..']
        }else{
            if(typeof step !== 'string') throw new Error( 'Path array must only contain strings');
            step = step.split(Matrix.unallowedCharacterRegexp).join('');
            if(step !== ''){
                if(typeof Node[step] === 'function'){
                    node = Node[step]
                }else{
                    node = Matrix(step, Node);
                    Node[step] = node;
                }
            }else{
                node = Node;
            }
            
        }
        if(path.length == 1) return node(); // Access function
        return node().build(path.slice(1)); // Access function
    };
    Access.init = Access.build;
    Access.touch = function(path){
        Access.build(path);
        return Access; // Access function
    };
    Access.go = function(path){
        if(typeof path === 'string' || typeof path === 'number'){
            path = path+'';
            path = path.split(Matrix.seperatorRegexp);
        }
        else if(!Array.isArray(path)) throw new Error( 'Path must be a string or Array');

        let node;
        let step = path[0];

        if(path.join('.') === '.'){
            return Node['..']();
        }else if(step === ''){
            node = Node['..']
        }else{
            if(typeof step !== 'string') throw new Error( 'Path array must only contain strings');
            step = step.split(Matrix.unallowedCharacterRegexp).join('');
            if(step !== ''){
                if(typeof Node[step] === 'function'){
                    node = Node[step]
                }else{
                    // Next step can't be found, create a virtual branch
                    // Don't append it to this node like in build method
                    node = Matrix(step, Node);
                }
            }else{
                node = Node;
            }
        }
        if(path.length == 1) return node(); // Access function
        return node().go(path.slice(1)); // Access function
    };
    Access.goto = Access.go;
    return Node;
}
Matrix.seperator = '.';
Matrix.seperatorRegexp = /\./g;
Matrix.unallowedCharacterRegexp = /[^0-9a-zA-Z_$]+/g;

var module; if(typeof module === 'object') module.exports = Matrix;

/*/
/// Usage Examples:

let matrix = Matrix();

matrix()
    .set('Root Node')
    .build('test')
        .touch('1')
        .touch(2)
        .build('hello')
            .set('Hello World!')
            .top()
    .build('a.long.one')
            .set(1111)
            .up()
        .build('two')
            .set(22222);

matrix.test[1]()
    .set(123);
matrix()
    .go('test.2')
    .set(23456);

console.log(matrix.test.hello().get());

matrix.test.hello()
    .set('Yo Earth!')

console.log(matrix().go('test.hello').get());
/*/