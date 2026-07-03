const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/cognito',
    createProxyMiddleware({
      target: 'http://localhost:4566',
      changeOrigin: true,
      pathRewrite: { '^/cognito': '' },
    })
  );
};
