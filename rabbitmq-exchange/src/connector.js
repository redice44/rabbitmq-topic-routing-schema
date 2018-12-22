class Connector {
  constructor(amqp, { user, pass, url }) {
    this.amqp = amqp;
    this.connectionString = `amqp://${user}:${pass}@${url}`;
    this.connection = null;;
    this.channel = null;
  }

  async connect() {
    if (!this.connection) {
      this.connection = await this.amqp.connect(this.connectionString);
    }
    if (!this.channel) {
      this.channel = await this.connection.createConfirmChannel();
    }
    this.addConnectionHandlers();
    this.addChannelHandlers();
  }

  async connectWithRetry(retries = 20, waitPeriod = 2000) {
    let numRetries = 0;
    let timeoutId;
    const waitSeconds = Math.floor(waitPeriod / 1000);

    try {
      await this.connect();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        if (numRetries < retries) {
          numRetries++;
          console.log(`Trying again in ${waitSeconds} seconds...`);
          timeoutId = setTimeout(connect, waitPeriod);
        } else {
          clearTimeout(timeoutId);
          throw error;
        }
      }
      throw error;
    }
  };

  async close() {
    if (this.channel) { await this.channel.close(); }
    if (this.connection) { await this.connection.close(); }
  }

  addConnectionHandlers() {
    this.connection.on('error', this.connectionErrorHandler.bind(this));
    this.connection.on('close', this.connectionCloseHandler.bind(this));
  }

  addChannelHandlers() {
    this.channel.on('error', this.channelErrorHandler.bind(this));
    this.channel.on('close', this.channelCloseHandler.bind(this));
  }

  connectionErrorHandler() { }
  connectionCloseHandler() { this.connection = null; }
  channelErrorHandler() { }
  channelCloseHandler() { this.channel = null; }
}

module.exports = Connector;
