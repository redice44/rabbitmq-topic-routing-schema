const ExchangeConnector = require('./exchange');

const ANY_TOKEN = '*';
const DELIM_TOKEN = '.';
const NULL_TOKEN = '_';

class TopicConnector extends ExchangeConnector {
  constructor(connectionParts, name, schema) {
    super(connectionParts);
    this.name = name;
    this.schemaKeys = this._buildBaseSchema(schema);
    this.schemaLength = schema.length;
  }

  async createTopic(options, override) {
    await this.createExchange({
      name: this.name,
      type: 'topic',
      options
    }, override);
  }

  async subscribeToTopic(topics, processMessage) {
    const key = this._buildSubscribeKey(topics);
    const { queue } = await this.getExclusiveQueue();
    await this.bindQueue(queue, key);
    await this.subscribe(queue, processMessage);
  }

  async publishToTopic(topics, content, options) {
    const key = this._buildPublishKey(topics);
    await this.publish(this.name, key, content, options);
  }

  _buildPublishKey(topics) {
    return this._buildKey(topics, NULL_TOKEN);
  }

  _buildSubscribeKey(topics) {
    return this._buildKey(topics, ANY_TOKEN);
  }

  _buildKey(topics, fillToken) {
    const topicKeys = Object.keys(topics);
    const key = Array.apply(null, { length: this.schemaLength }).map(() => fillToken);

    for (let i = 0; i < topicKeys.length; i++) {
      const keySchema = this.schemaKeys[topicKeys[i]];
      if (!keySchema) {
        throw new Error(`Schema Violation: No key "${topicKeys[i]}" in schema.`);
      }
      const value = topics[topicKeys[i]];
      const valueIndex = keySchema.values.indexOf(value);
      if (valueIndex === -1) {
        throw new Error(`Schema Violation: No value "${value}" in "${topicKeys[i]}".`);
      }
      key[keySchema.index] = String.fromCharCode(65 + valueIndex);
    }

    return key.join(DELIM_TOKEN);
  }

  _buildBaseSchema(schema) {
    return schema.reduce((acc, topicKey, i) => {
      acc[topicKey.key] = {
        index: i,
        values: topicKey.values,
        description: topicKey.description
      };
      return acc;
    }, {});
  }
};

module.exports = TopicConnector;
