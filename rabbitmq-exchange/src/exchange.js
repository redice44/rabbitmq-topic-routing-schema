const Connector = require('./connector');

const EXCHANGE_TYPES = [
  'topic',
  'direct',
  'fanout',
  'headers'
];

class ExchangeConnector extends Connector {
  constructor(amqp, connectionParts) {
    super(amqp, connectionParts);
    this.exchange = null;
  }

  async createExchange({ name, type, options = {} }, override = false) {
    if(!EXCHANGE_TYPES.includes(type)) {
      throw new Error(`Invalid exchange type: ${type}`);
    }
    try {
      await this.channel.assertExchange(name, type, options);
      this.exchange = { name, type, options };
    } catch (error) {
      // Reconnect the channel, but still bubble error
      await this.connect();
      if (override) {
        await this.channel.deleteExchange(name);
        await this.createExchange({ name, type, options });
      } else {
        throw error;
      }
    }
  }
}

// Maybe useful someday
const isExchangeTypeError = error => {
  const { code, classId, methodId } = error;
  return code === 406 && classId === 40 && methodId === 10;
};

module.exports = ExchangeConnector;
