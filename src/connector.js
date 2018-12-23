const amqp = require('amqplib');

class Connector {
  constructor({ user, pass, url }) {
    this.connectionString = `amqp://${user}:${pass}@${url}`;
    this.connection = null;;
    this.channel = null;
    this.timeoutId = null;
  }

  async connect() {
    if (!this.connection) {
      this.connection = await amqp.connect(this.connectionString);
    }
    if (!this.channel) {
      this.channel = await this.connection.createConfirmChannel();
    }
    this.addConnectionHandlers();
    this.addChannelHandlers();
  }

  async connectWithRetry(retries = 20, waitPeriod = 2000) {
    const waitSeconds = Math.floor(waitPeriod / 1000);

    try {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      await this.connect();
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        if (retries > 0) {
          retries--;
          console.log(`Retries remaining: ${retries}. Trying again in ${waitSeconds} seconds...`);
          this.timeoutId = setTimeout(this.connectWithRetry.bind(this), waitPeriod, retries);
        } else {
          clearTimeout(this.timeoutId);
          this.timeoutId = null;
          throw error;
        }
      }
      throw error;
    }
  };

  async getExclusiveQueue(options) {
    return await this.getNamedQueue('', Object.assign(
      {}, options, { exclusive: true }
    ));
  }

  async getNamedQueue(queueName, options = {}, override = false) {
    this.ensureChannel();
    try {
      return await this.channel.assertQueue(queueName, options);
    } catch (error) {
      await this.connect();
      if (override) {
        await this.channel.deleteQueue(queueName);
        return this.getNamedQueue(queueName, options);
      }
      throw error;
    }
  }

  async publish(exchangeName = '', key, content, options = {}) {
    this.ensureChannel();
    const message = Buffer.isBuffer(content) ? content : Buffer.from(content);
    try {
      await this.channel.publish(exchangeName, key, message, options);
    } catch (error) {
      // Buffer full. Drain event. I think.
      throw error;
    }
    try {
      await this.channel.waitForConfirms();
    } catch (error) {
      // Nack
      throw error;
    }
  }

  async subscribe(queueName, processMessage, options = {}) {
    this.ensureChannel();
    await this.channel.consume(queueName, processMessage, options);
  }

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
  ensureChannel() {
    if (!this.channel) {
      throw new Error('This requires an active channel');
    }
  }
  ensureConnection() {
    if (!this.connection) {
      throw new Error('This requires an active connection.');
    }
  }
}

// Maybe useful someday
const isQueueTypeError = error => {
  const { code, classId, methodId } = error;
  return code === 406 && classId === 50 && methodId === 10;
};

module.exports = Connector;
