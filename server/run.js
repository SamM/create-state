const CreateState = require('./src/CreateState');

const CS = new CreateState(8888);

CS.adapt('adapters/404');
CS.adapt('adapters/ServeFavicon');
CS.adapt('adapters/FileStorage');
CS.adapt('adapters/ClientStaticFiles');

CS.startServer();