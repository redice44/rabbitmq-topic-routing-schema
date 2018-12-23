const Connector = require('./connector');

const EXCHANGE_TYPES = [
  'topic',
  'direct',
  'fanout',
  'headers'
];

class ExchangeConnector extends Connector {
  constructor(connectionParts) {
    super(connectionParts);
    this.exchange = null;
  }

  async createExchange({ name, type, options = {} }, override = false) {
    if(!EXCHANGE_TYPES.includes(type)) {
      throw new Error(`Invalid exchange type: ${type}`);
    }
    try {
      this.exchange = { name, type, options };
      await this.channel.assertExchange(name, type, options);
    } catch (error) {
      // Reconnect the channel, but still bubble error
      await this.connect();
      if (override) {
        await this.deleteExchange();
        await this.createExchange({ name, type, options });
      } else {
        throw error;
      }
    }
  }

  async bindQueue(queueName, keys, options = {}) {
    this.ensureChannel();
    this.ensureExchange();
    await this.channel.bindQueue(queueName, this.exchange.name, keys, options);
  }

  async deleteExchange() {
    if (this.exchange) {
      await this.channel.deleteExchange(this.exchange.name);
      this.exchange = null;
    }
  }

  ensureExchange() {
    if (!this.exchange) {
      throw new Error('This requires an active exchange.');
    }
  }
}

// Maybe useful someday
const isExchangeTypeError = error => {
  const { code, classId, methodId } = error;
  return code === 406 && classId === 40 && methodId === 10;
};

module.exports = ExchangeConnector;
