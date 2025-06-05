module.exports = {
  development: {
    client: 'pg',
    connection:'postgres://taskmanager_user:0318@localhost:5432/taskmanager',
    migrations: {
      directory: './migrations'
    }
  }
};