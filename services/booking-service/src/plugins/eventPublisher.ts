import fp from 'fastify-plugin';
import { BookingsEventPublisher } from '../events/publisher';

export default fp(async (fastify) => {
  const bookingEventPublisher = new BookingsEventPublisher(fastify);
  fastify.decorate('bookingEventPublisher', bookingEventPublisher);
}, {
  name: 'booking-event-publisher',
  dependencies: ['rabbitmq-plugin']
});
