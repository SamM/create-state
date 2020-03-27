const CreateState = require('./CreateState');

const CS = new CreateState(8888);

CS.adapt('adapters/404');
CS.adapt('adapters/ServeFavicon');

CS.startServer();