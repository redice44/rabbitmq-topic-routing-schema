const Connector = require('./connector');

class ExchangeConnector extends Connector {
  async _create({ name, type, options }) {
    try {
      await this.channel.assertExchange(name, type, options);
      return { name, type, options };
    } catch (error) {
      // Reconnect the channel, but still bubble error
      await this.connect();
      throw error;
    }
  }

  async createDirect(name, options) {
    return await this._create({ name, type: 'direct', options });
  }

  async createFanout(name, options) {
    return await this._create({ name, type: 'fanout', options });
  }

  async createHeaders(name, options) {
    return await this._create({ name, type: 'headers', options });
  }

  async createTopic(name, options) {
    return await this._create({ name, type: 'topic', options });
  }
}

// Maybe useful someday
const isExchangeTypeError = error => {
  const { code, classId, methodId } = error;
  return code === 406 && classId === 40 && methodId === 10;
};

module.exports = ExchangeConnector;
