# RabbitMQ: Topic Routing Schema

I realized with the topic key limit, that if we wanted to have really complex representations of topics, we'd likely easily exceed the limit.

This will let you set up a schema contract between a publisher and subscriber over an exchange. It will encode a set of key/values that are valid in the schema to a minimal topic key representation.

This let's you focus on the topics and values you want to pub/sub to instead of worrying about the order or matching topic names of the key. 

## Example Schema

```js
const schema = [{
  key: 'city',
  values: ['London', 'New York', 'Tokyo'],
  description: 'Originating location'
}, {
  key: 'priority',
  values: ['critical', 'high', 'medium', 'low'],
  description: 'Priority of message'
}, {
  key: 'weather',
  values: ['sunny', 'raining', 'snowing'],
  description: 'Forecast weather'
}, {
  key: 'time',
  values: ['today', 'tomorrow', 'yesterday'],
  description: 'Time of event'
}]
```

## Usage

### Subscriber

```js
const TopicConnector = require('@redice44/rabbitmq-topic-routing-schema');
const subTopics = {
  time: 'today',
  city: 'Tokyo'
};

const main = async () => {
  const connection = new TopicConnector(connectionParts, 'weather', schema);
  try {
    await connection.connectWithRetry();
    await connection.createTopic();
    await connection.subscribeToTopic(subTopics, processMessage);
    console.log('Listening');
  } catch (error) {
    throw error;
  }
};
```

### Publisher

```js
const TopicConnector = require('@redice44/rabbitmq-topic-routing-schema');
const subTopics = {
  time: 'today',
  city: 'Tokyo',
  weather: 'snowing'
};

const main = async () => {
  const connection = new TopicConnector(connectionParts, 'weather', schema);
  try {
    await connection.connectWithRetry();
    await connection.createTopic();
    await connection.publishToTopic(subTopics, 'Expect more.');
    await connection.close();
  } catch (error) {
    throw error;
  }
};
```
