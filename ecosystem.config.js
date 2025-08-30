module.exports = {
  apps: [
    {
      name: 'user-service',
      script: 'services/user-service/dist/index.js',
      cwd: '/home/ubuntu/zefy-home-services-backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        MONGO_URI: 'mongodb://localhost:27017/zefy_users',
        REDIS_URL: 'redis://localhost:6379',
        AMQP_URL: 'amqp://admin:password123@localhost:5672'
      },
      error_file: '/home/ubuntu/logs/user-service-error.log',
      out_file: '/home/ubuntu/logs/user-service-out.log',
      log_file: '/home/ubuntu/logs/user-service.log'
    },
    {
      name: 'booking-service',
      script: 'services/booking-service/dist/index.js',
      cwd: '/home/ubuntu/zefy-home-services-backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        MONGO_URI: 'mongodb://localhost:27017/zefy_bookings',
        REDIS_URL: 'redis://localhost:6379',
        AMQP_URL: 'amqp://admin:password123@localhost:5672',
        USER_SERVICE_URL: 'http://localhost:3001',
        PARTNER_SERVICE_URL: 'http://localhost:3003'
      },
      error_file: '/home/ubuntu/logs/booking-service-error.log',
      out_file: '/home/ubuntu/logs/booking-service-out.log',
      log_file: '/home/ubuntu/logs/booking-service.log'
    },
    {
      name: 'partner-service',
      script: 'services/partner-service/dist/index.js',
      cwd: '/home/ubuntu/zefy-home-services-backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        MONGO_URI: 'mongodb://localhost:27017/zefy_partners',
        REDIS_URL: 'redis://localhost:6379',
        AMQP_URL: 'amqp://admin:password123@localhost:5672',
        BOOKING_SERVICE_URL: 'http://localhost:3002'
      },
      error_file: '/home/ubuntu/logs/partner-service-error.log',
      out_file: '/home/ubuntu/logs/partner-service-out.log',
      log_file: '/home/ubuntu/logs/partner-service.log'
    },
    {
      name: 'gateway',
      script: 'services/gateway/dist/index.js',
      cwd: '/home/ubuntu/zefy-home-services-backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        USER_SERVICE_URL: 'http://localhost:3001',
        BOOKING_SERVICE_URL: 'http://localhost:3002',
        PARTNER_SERVICE_URL: 'http://localhost:3003',
        REDIS_URL: 'redis://localhost:6379',
        AMQP_URL: 'amqp://admin:password123@localhost:5672'
      },
      error_file: '/home/ubuntu/logs/gateway-error.log',
      out_file: '/home/ubuntu/logs/gateway-out.log',
      log_file: '/home/ubuntu/logs/gateway.log'
    },
    {
      name: 'admin',
      script: 'services/admin-service/dist/index.js',
      cwd: '/home/ubuntu/zefy-home-services-backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
        MONGO_URI: 'mongodb://localhost:27017/zefy_admin',
        REDIS_URL: 'redis://localhost:6379',
        AMQP_URL: 'amqp://admin:password123@localhost:5672',
      },
      error_file: '/home/ubuntu/logs/gateway-error.log',
      out_file: '/home/ubuntu/logs/gateway-out.log',
      log_file: '/home/ubuntu/logs/gateway.log'
    }
  ]
};
