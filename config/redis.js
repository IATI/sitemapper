import { createClient } from 'redis';
import config from './config.js';

// Send a periodic PING and reconnect with a capped backoff so Azure Cache for Redis
// (and the load balancer in front of it) doesn't reap the idle TLS connection, which
// otherwise surfaces as SocketClosedUnexpectedlyError.
const connectionOptions = {
    pingInterval: 60000,
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
};
if (config.REDIS_KEY && config.REDIS_HOSTNAME) {
    connectionOptions.url = `rediss://${config.REDIS_HOSTNAME}:${config.REDIS_PORT}`;
    connectionOptions.password = config.REDIS_KEY;
}
const client = createClient(connectionOptions);
client.on('ready', () => {
    console.log({
        name: 'redisConnect',
        value: `Redis: Connection to ${config.REDIS_HOSTNAME || 'local'} ready`,
    });
});
// Log connection errors but do NOT rethrow: an async throw here becomes an uncaught
// exception that kills the Functions Node worker. The client reconnects via
// reconnectStrategy on its own.
client.on('error', (err) => {
    console.error('Redis: Unable to connect to the redis database: ', err);
});

await client.connect();

export default client;
